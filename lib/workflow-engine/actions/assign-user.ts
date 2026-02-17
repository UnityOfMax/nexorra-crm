import { supabaseAdmin } from '@/lib/supabase';
import { WorkflowContext, ExecutionResult } from '../types';

export async function assignUserAction(
  context: WorkflowContext,
  config: Record<string, any>
): Promise<ExecutionResult> {
  try {
    const { assignmentType, userId } = config;

    if (!context.contactId) {
      return {
        success: false,
        error: 'No contact ID available',
      };
    }

    let assignedUserId: string | null = null;

    if (assignmentType === 'specific') {
      if (!userId) {
        return {
          success: false,
          error: 'User ID is required for specific assignment',
        };
      }
      assignedUserId = userId;
    } else if (assignmentType === 'round_robin') {
      // Get all users for the account and find the one with least recent assignment
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('account_id', context.accountId)
        .order('created_at', { ascending: true });

      if (!users || users.length === 0) {
        return {
          success: false,
          error: 'No users available for round robin assignment',
        };
      }

      // Simple round robin: get last assigned user and pick next one
      const { data: lastAssignment } = await supabaseAdmin
        .from('contacts')
        .select('assigned_to')
        .eq('account_id', context.accountId)
        .not('assigned_to', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (!lastAssignment?.assigned_to) {
        // No previous assignments, assign to first user
        assignedUserId = users[0].id;
      } else {
        // Find current user index and assign to next
        const currentIndex = users.findIndex((u) => u.id === lastAssignment.assigned_to);
        const nextIndex = (currentIndex + 1) % users.length;
        assignedUserId = users[nextIndex].id;
      }
    } else if (assignmentType === 'least_busy') {
      // Count contacts per user and assign to the one with least
      const { data: userCounts } = await supabaseAdmin
        .from('contacts')
        .select('assigned_to')
        .eq('account_id', context.accountId)
        .not('assigned_to', 'is', null);

      const { data: allUsers } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('account_id', context.accountId);

      if (!allUsers || allUsers.length === 0) {
        return {
          success: false,
          error: 'No users available for assignment',
        };
      }

      // Count assignments per user
      const counts: Record<string, number> = {};
      allUsers.forEach((u) => (counts[u.id] = 0));
      userCounts?.forEach((c) => {
        if (c.assigned_to) counts[c.assigned_to] = (counts[c.assigned_to] || 0) + 1;
      });

      // Find user with minimum count
      let minCount = Infinity;
      let leastBusyUserId = allUsers[0].id;
      Object.entries(counts).forEach(([uid, count]) => {
        if (count < minCount) {
          minCount = count;
          leastBusyUserId = uid;
        }
      });

      assignedUserId = leastBusyUserId;
    }

    if (!assignedUserId) {
      return {
        success: false,
        error: 'Failed to determine user for assignment',
      };
    }

    // Update contact
    const { error } = await supabaseAdmin
      .from('contacts')
      .update({ assigned_to: assignedUserId })
      .eq('id', context.contactId);

    if (error) {
      return {
        success: false,
        error: 'Failed to assign user to contact',
      };
    }

    // Log activity
    await supabaseAdmin.from('activities').insert({
      account_id: context.accountId,
      contact_id: context.contactId,
      type: 'note',
      subject: 'User Assigned',
      description: `Contact assigned to user via workflow (${assignmentType})`,
      completed: true,
      created_by: context.accountId,
    });

    return {
      success: true,
      data: {
        assignedUserId,
        assignmentType,
      },
    };
  } catch (error) {
    console.error('Error in assignUserAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error assigning user',
    };
  }
}
