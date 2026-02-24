import { supabaseAdmin } from '@/lib/supabase';
import { WorkflowContext, ExecutionResult } from '../types';

export async function addTagAction(
  context: WorkflowContext,
  config: Record<string, any>
): Promise<ExecutionResult> {
  try {
    const { tags } = config;

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return {
        success: false,
        error: 'No tags specified',
      };
    }

    if (!context.contactId) {
      return {
        success: false,
        error: 'No contact ID available',
      };
    }

    // Get current contact tags
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('tags')
      .eq('id', context.contactId)
      .single();

    if (!contact) {
      return {
        success: false,
        error: 'Contact not found',
      };
    }

    // Merge new tags with existing tags (avoid duplicates)
    const existingTags = contact.tags || [];
    const mergedTags = Array.from(new Set([...existingTags, ...tags]));

    // Update contact with new tags
    const { error } = await supabaseAdmin
      .from('contacts')
      .update({ tags: mergedTags })
      .eq('id', context.contactId);

    if (error) {
      return {
        success: false,
        error: 'Failed to update contact tags',
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
        subject: 'Tags Added',
        description: `Added tags via workflow: ${tags.join(', ')}`,
        completed: true,
        created_by: createdBy,
      });
    }

    return {
      success: true,
      data: {
        tagsAdded: tags,
        totalTags: mergedTags.length,
      },
    };
  } catch (error) {
    console.error('Error in addTagAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error adding tags',
    };
  }
}
