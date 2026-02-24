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
      // Get all members for the account
      const { data: members } = await supabaseAdmin
        .from('account_members')
        .select('user_id')
        .eq('account_id', context.accountId)
        .order('created_at', { ascending: true });

      if (!members || members.length === 0) {
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
        .maybeSingle();

      if (!lastAssignment?.assigned_to) {
        assignedUserId = members[0].user_id;
      } else {
        const currentIndex = members.findIndex((m) => m.user_id === lastAssignment.assigned_to);
        const nextIndex = (currentIndex + 1) % members.length;
        assignedUserId = members[nextIndex].user_id;
      }
    } else if (assignmentType === 'least_busy') {
      // Count contacts per user and assign to the one with least
      const { data: userCounts } = await supabaseAdmin
        .from('contacts')
        .select('assigned_to')
        .eq('account_id', context.accountId)
        .not('assigned_to', 'is', null);

      const { data: allMembers } = await supabaseAdmin
        .from('account_members')
        .select('user_id')
        .eq('account_id', context.accountId);

      if (!allMembers || allMembers.length === 0) {
        return {
          success: false,
          error: 'No users available for assignment',
        };
      }

      // Count assignments per user
      const counts: Record<string, number> = {};
      allMembers.forEach((m) => (counts[m.user_id] = 0));
      userCounts?.forEach((c) => {
        if (c.assigned_to) counts[c.assigned_to] = (counts[c.assigned_to] || 0) + 1;
      });

      // Find user with minimum count
      let minCount = Infinity;
      let leastBusyUserId = allMembers[0].user_id;
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
    const { data: ownerMember } = await supabaseAdmin
      .from('account_members')
      .select('user_id')
      .eq('account_id', context.accountId)
      .eq('role', 'owner')
      .single();
    const createdBy = ownerMember?.user_id;
    if (createdBy) {
      await supabaseAdmin.from('activities').insert({
        account_id: context.accountId,
        contact_id: context.contactId,
        type: 'note',
        subject: 'User Assigned',
        description: `Contact assigned to user via workflow (${assignmentType})`,
        completed: true,
        created_by: createdBy,
      });
    }

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
