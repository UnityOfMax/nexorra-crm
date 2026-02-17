import { supabaseAdmin } from '@/lib/supabase';
import { WorkflowContext, ExecutionResult } from '../types';
import { replaceVariables } from '../conditions';

export async function updateContactAction(
  context: WorkflowContext,
  config: Record<string, any>
): Promise<ExecutionResult> {
  try {
    const { updates } = config;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return {
        success: false,
        error: 'No field updates specified',
      };
    }

    if (!context.contactId) {
      return {
        success: false,
        error: 'No contact ID available',
      };
    }

    // Build update object
    const updateData: Record<string, any> = {};
    const changedFields: string[] = [];

    for (const update of updates) {
      const { field, value } = update;
      if (field && value !== undefined) {
        // Replace variables in value
        const processedValue = replaceVariables(String(value), context);
        updateData[field] = processedValue;
        changedFields.push(field);
      }
    }

    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        error: 'No valid updates provided',
      };
    }

    // Update contact
    const { error } = await supabaseAdmin
      .from('contacts')
      .update(updateData)
      .eq('id', context.contactId);

    if (error) {
      return {
        success: false,
        error: 'Failed to update contact',
      };
    }

    // Log activity
    await supabaseAdmin.from('activities').insert({
      account_id: context.accountId,
      contact_id: context.contactId,
      type: 'note',
      subject: 'Contact Updated',
      description: `Updated fields via workflow: ${changedFields.join(', ')}`,
      completed: true,
      created_by: context.accountId,
    });

    return {
      success: true,
      data: {
        fieldsUpdated: changedFields,
        updates: updateData,
      },
    };
  } catch (error) {
    console.error('Error in updateContactAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error updating contact',
    };
  }
}
