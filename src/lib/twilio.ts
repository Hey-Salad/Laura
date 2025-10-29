import twilio from "twilio";

const sid = process.env.TWILIO_ACCOUNT_SID || "";
const token = process.env.TWILIO_AUTH_TOKEN || "";
const from = process.env.TWILIO_FROM_NUMBER || "";

export const twilioClient = sid && token ? twilio(sid, token) : null;
export const twilioFromNumber = from;
