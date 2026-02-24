import { ActionHandler } from '../types';
import { sendEmailAction } from './send-email';
import { sendSMSAction } from './send-sms';
import { addTagAction } from './add-tag';
import { updateContactAction } from './update-contact';
import { moveDealStageAction } from './move-deal-stage';
import { assignUserAction } from './assign-user';
import { aiRespondAction } from './ai-respond';
import { createOpportunityAction } from './create-opportunity';

export const actionHandlers: Record<string, ActionHandler> = {
  send_email: sendEmailAction,
  send_sms: sendSMSAction,
  add_tag: addTagAction,
  update_contact: updateContactAction,
  move_deal_stage: moveDealStageAction,
  assign_user: assignUserAction,
  ai_respond: aiRespondAction,
  create_opportunity: createOpportunityAction,
};

export function getActionHandler(stepType: string): ActionHandler | undefined {
  return actionHandlers[stepType];
}
