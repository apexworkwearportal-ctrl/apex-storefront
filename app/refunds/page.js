"use client";

import LegalLayout from "@/components/LegalLayout";

export default function RefundsPage() {
  return (
    <LegalLayout
      title="Refund and Return Policy"
      lastUpdated="August 2026"
      breadcrumbLabel="Refund & Return Policy"
    >
      <h2>Overview</h2>
      <p>
        Most products at Apex Workwear are custom configured and printed to order. Because of that, our refund and return process works differently than a typical retail store. This page explains what's covered, what isn't, and how to reach us if something's wrong.
      </p>

      <h2>Our Guarantee</h2>
      <p>
        If your order arrives with a printing error, a material defect, or doesn't match the digital proof you approved, we'll reprint it at no cost or issue a full refund, your choice.
      </p>

      <h2>What's Covered</h2>
      <ul>
        <li>Printing errors on our end: wrong size, wrong material, wrong quantity, or wrong finish from what you configured</li>
        <li>Product defects: poor print quality, damaged material, misaligned or smudged prints</li>
        <li>Items damaged in transit, reported within 48 hours of delivery with photos</li>
        <li>Orders that don't match the digital proof you approved before production began</li>
      </ul>

      <h2>What's Not Covered</h2>
      <ul>
        <li>Errors in artwork, text, or file setup submitted by you, including spelling, low-resolution images, or incorrect bleed and margins. Once you approve a proof, we print exactly what was submitted.</li>
        <li>Minor colour variance between your screen and the final printed piece. This is a normal result of the printing process, not a defect.</li>
        <li>Change of mind after production has started</li>
        <li>Custom or made-to-order products once production has begun (see Cancellations below)</li>
      </ul>

      <h2>Reporting an Issue</h2>
      <p>
        1. Contact us within 7 days of delivery at <strong>info@apexworkwear.ca</strong> or <strong>(647) 570-1249</strong><br />
        2. Include your order number and photos showing the issue<br />
        3. We'll review and respond within 2 business days
      </p>

      <h2>Cancellations</h2>
      <p>
        Orders enter production immediately once you approve your proof and complete payment. This is what makes our fast turnaround times possible, but it also means most orders can't be cancelled or modified after that point.
      </p>
      <p>
        If you need to cancel, contact us as soon as possible after placing your order. We'll do what we can to stop production if it hasn't started yet, but we can't guarantee it.
      </p>

      <h2>Price Match Guarantee Terms</h2>
      <p>
        We'll match or beat any written, comparable quote from a competitor for the same product, specifications, and quantity. The quote must be current, from a legitimate GTHA or Ontario-wide print supplier, and provided before your order is placed.
      </p>

      <h2>Shipping Costs on Approved Reprints or Refunds</h2>
      <p>
        Covered by Apex Workwear whenever the issue is our error.
      </p>

      <h2>Contact Us</h2>
      <p>
        Email: <strong>info@apexworkwear.ca</strong><br />
        Phone: <strong>(647) 570-1249</strong><br />
        Hours: Monday to Friday, 9:00 AM to 8:30 PM
      </p>
    </LegalLayout>
  );
}
