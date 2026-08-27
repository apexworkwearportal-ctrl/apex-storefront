"use client";

import LegalLayout from "@/components/LegalLayout";

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms and Conditions"
      lastUpdated="August 2026"
      breadcrumbLabel="Terms & Conditions"
    >
      <h2>1. Acceptance of Terms</h2>
      <p>
        By using this website or placing an order, you agree to these terms and conditions.
      </p>

      <h2>2. About Apex Workwear</h2>
      <p>
        Apex Workwear is an online print and apparel storefront serving the Greater Toronto and Hamilton Area, with shipping across Ontario. We offer wholesale trade pricing on a full catalogue of print and apparel products, finished through our Ontario-based production network.
      </p>

      <h2>3. Accounts</h2>
      <p>
        If you create a Customer Portal account, you're responsible for keeping your login credentials secure and for all activity under your account.
      </p>

      <h2>4. Ordering and Production</h2>
      <ul>
        <li>Pricing is calculated dynamically based on your configuration: size, material, and quantity.</li>
        <li>Orders enter production immediately once payment is completed and, where applicable, your digital proof is approved. This is what makes our fast turnaround times possible, but it also limits our ability to modify or cancel orders after submission.</li>
        <li>You're responsible for reviewing and approving any digital proof before production begins. Once approved, we print exactly what was submitted.</li>
      </ul>

      <h2>5. Pricing and Payment</h2>
      <ul>
        <li>All prices are listed in Canadian dollars (CAD) and are subject to applicable taxes, including HST.</li>
        <li>Payment is due at checkout and processed securely by our third-party payment processor.</li>
        <li>We reserve the right to correct pricing errors, including on orders already placed, before production begins.</li>
      </ul>

      <h2>6. Price Match Guarantee</h2>
      <p>
        See our Refund and Return Policy for full terms and conditions.
      </p>

      <h2>7. Turnaround and Shipping</h2>
      <ul>
        <li>Turnaround times are estimates based on standard production schedules and are not guaranteed, except where explicitly stated, such as same-day cutoff times.</li>
        <li>We ship across the Greater Toronto and Hamilton Area and Ontario-wide. Free shipping applies to eligible orders as noted at checkout.</li>
        <li>Risk of loss transfers to you upon delivery.</li>
      </ul>

      <h2>8. Intellectual Property</h2>
      <ul>
        <li>You retain ownership of any artwork, logos, or designs you submit.</li>
        <li>By submitting artwork, you confirm you have the legal right to use and reproduce it, and you agree to indemnify Apex Workwear against any claims arising from content you submit.</li>
        <li>We reserve the right to refuse any order containing content that is illegal, infringing on someone else's rights, or otherwise inappropriate.</li>
      </ul>

      <h2>9. Refunds and Returns</h2>
      <p>
        Governed by our separate Refund and Return Policy.
      </p>

      <h2>10. Limitation of Liability</h2>
      <p>
        To the extent permitted by law, Apex Workwear's liability for any claim related to your order is limited to the amount you paid for that order. We are not liable for indirect, incidental, or consequential damages.
      </p>

      <h2>11. Governing Law</h2>
      <p>
        These terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable within it.
      </p>

      <h2>12. Changes to These Terms</h2>
      <p>
        We may update these terms from time to time. Continued use of our website after changes are posted constitutes acceptance of the updated terms.
      </p>

      <h2>13. Contact Us</h2>
      <p>
        Email: <strong>info@apexworkwear.ca</strong><br />
        Phone: <strong>(647) 570-1249</strong><br />
        Address: 1515 Britannia Rd E, Unit 14-15, Mississauga, ON L4W 4K1
      </p>
    </LegalLayout>
  );
}
