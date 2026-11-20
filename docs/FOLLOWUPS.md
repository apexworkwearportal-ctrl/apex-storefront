# Follow-ups (not done yet)

Notes from the pricing / cart work. Ordered roughly by importance.

1. **Server-side price validation (security).** `/api/checkout` trusts `price`, `totalPrice`,
   `setupFee` and promo `discountAmount` sent by the browser. Recompute from Firestore
   (apparel: base + location + size upcharges + sale + embroidery setup; custom print:
   `calculateCustomPrintPrice` + saved option groups) and reject mismatches.
2. **Promo discount ignored on mixed carts.** `lib/order-splitter.js` builds PRINT and APPAREL
   sub-orders without applying `totals.discount`. Split the discount proportionally.
3. **Live Firestore text still says DTG.** Seed/backup files were changed to DTF, but the
   stored category descriptions and FAQs need a re-seed or manual edit.
4. **Cover color for booklets.** Suite lets the cover print in a different color mode than the
   interior; the storefront uses one print mode for both.
5. **Markup floor.** Storefront clamps markup to >= 1x, Suite does not (matters only if < 1).
6. **NCR forms** exist in Suite (`calcNCR`) but not in the storefront calculator.
7. **Percent add-ons** (lamination etc.) are storefront-only: % of (setup + cost x markup).
   Confirm that is the base the business wants.
8. **Customer page default marker.** Defaults are pre-selected but not labelled "Default".
9. **Lint:** `react-hooks/set-state-in-effect` errors in `lib/cart-context.js` and others
   (pre-existing).
10. **Cart artwork upload** mutates cart items in place instead of through context state.
11. **Admin products API:** `lib/custom-print-pricing-server.js` loads settings but option
    groups are priced client-side only (see item 1).
