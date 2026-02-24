import { Resend } from 'resend';

// Module-level singleton: constructed once per container lifetime
export const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
