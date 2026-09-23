import { Resend } from "resend";

export function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const resend = new Proxy({}, {
  get(target, prop) {
    const key = process.env.RESEND_API_KEY;
    if (!key) return undefined;
    const client = new Resend(key);
    return client[prop];
  }
});

export default resend;
