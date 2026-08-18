import resend from "@/lib/resend";

export async function POST(req) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log(`Received contact form inquiry from: ${name} <${email}>`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey || apiKey === "mock_resend_key" || apiKey === "") {
      console.warn("Resend API key is not configured. Email logged to console.");
      return Response.json({
        success: true,
        message: "Message logged to server console (Resend key missing).",
      });
    }

    // Send email using Resend
    const emailRes = await resend.emails.send({
      from: "Apex Storefront <onboarding@resend.dev>", // Or verified sender from resend
      to: "info@apexworkwear.ca",
      reply_to: email,
      subject: `[Contact Form] ${subject} - from ${name}`,
      text: `You have received a new contact inquiry from the Apex Storefront.

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
`,
    });

    if (emailRes.error) {
      throw new Error(emailRes.error.message || "Failed to send email");
    }

    return Response.json({
      success: true,
      message: "Your message has been sent successfully.",
    });
  } catch (error) {
    console.error("Error processing contact form:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
