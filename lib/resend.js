import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "mock_resend_key");

export default resend;
