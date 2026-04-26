/** Re-export shim — implementation lives in `@compass/sdk`. */
export {
  listRecipients,
  addRecipients,
  removeRecipient,
  getRecipientStats,
  sendInvitations,
} from '@compass/sdk';
export type { AddRecipientInput, RecipientStats } from '@compass/sdk';
