import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
const authToken = process.env.TWILIO_AUTH_TOKEN || '';

// Module-level singleton: constructed once per container lifetime
export const twilioClient = accountSid && authToken
  ? twilio(accountSid, authToken)
  : null;

// Re-export for signature validation
export { twilio };
