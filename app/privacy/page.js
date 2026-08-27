"use client";

import LegalLayout from "@/components/LegalLayout";

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="August 2026"
      breadcrumbLabel="Privacy Policy"
    >
      <h2>Introduction</h2>
      <p>
        Apex Workwear is committed to protecting your personal information in accordance with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA). This policy explains what we collect, why we collect it, and how it's handled.
      </p>

      <h2>Information We Collect</h2>
      <ul>
        <li><strong>Contact information</strong>: name, email address, phone number, shipping and billing address</li>
        <li><strong>Order information</strong>: products configured, artwork or design files you upload, order history</li>
        <li><strong>Payment information</strong>: processed securely by our third-party payment processor. We do not store full payment card details on our systems.</li>
        <li><strong>Account information</strong>, if you create a Customer Portal account</li>
        <li><strong>Communications</strong>: messages sent through our contact form, by phone, or by email</li>
        <li><strong>Website usage data</strong>: collected through cookies and analytics tools, such as pages visited and device or browser type</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <ul>
        <li>To process and fulfill your orders</li>
        <li>To communicate with you about your order, including proofs, production updates, and delivery</li>
        <li>To respond to inquiries and provide customer support</li>
        <li>To send marketing communications, only where you've given consent, in line with Canada's Anti-Spam Legislation (CASL). You can unsubscribe at any time.</li>
        <li>To improve our website and product catalogue</li>
      </ul>

      <h2>How We Share Your Information</h2>
      <ul>
        <li>With our production partners, to fulfill your print or apparel order. Only the information necessary to produce and ship your order is shared.</li>
        <li>With shipping carriers, to deliver your order</li>
        <li>With our payment processor, to process payment securely</li>
        <li>We do not sell your personal information to third parties</li>
      </ul>

      <h2>Cookies and Tracking</h2>
      <p>
        Our website uses cookies to support core functionality, like your shopping cart, and for analytics. You can control cookies through your browser settings.
      </p>

      <h2>Data Retention</h2>
      <p>
        We retain personal information only as long as needed to fulfill the purposes described in this policy, or as required by law.
      </p>

      <h2>Your Rights</h2>
      <p>
        Under PIPEDA, you have the right to access the personal information we hold about you, request corrections, and withdraw consent for marketing communications at any time. Contact us at <strong>info@apexworkwear.ca</strong> to make a request.
      </p>

      <h2>Security</h2>
      <p>
        We use reasonable administrative, technical, and physical safeguards to protect your personal information. No method of transmission or storage is 100 percent secure.
      </p>

      <h2>Children's Privacy</h2>
      <p>
        Our services are intended for business and adult consumer use. We do not knowingly collect personal information from children.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. The "Last Updated" date at the top reflects the most recent version.
      </p>

      <h2>Contact Us</h2>
      <p>
        For privacy questions or requests:<br />
        Email: <strong>info@apexworkwear.ca</strong><br />
        Phone: <strong>(647) 570-1249</strong><br />
        Address: 1515 Britannia Rd E, Unit 14-15, Mississauga, ON L4W 4K1
      </p>
    </LegalLayout>
  );
}
