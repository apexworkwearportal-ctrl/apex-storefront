# Build Prompt — Apex Workwear Online Printing Storefront

Paste this into Google Antigravity as the master build instruction. It's broken into phases — build and verify each phase before moving to the next rather than doing everything at once.

---

## 1. Project Context

Build a full e-commerce printing storefront for **Apex Workwear** (apexworkwear.ca), a GTA-based print & apparel company. Their current site (apexworkwear.ca) is a WordPress lead-gen site with a "request a quote" form — no real checkout. This new build replaces that print-products experience with a real e-commerce storefront: customers browse products, configure options, see live pricing, and check out directly — no quote form, no waiting.

**Design inspiration:** [vistaprint.com](https://www.vistaprint.com/) — clean product grid, strong category navigation, confident use of whitespace, prominent trust/quality signals, fast-feeling interactions, product cards with hover states. Use Vistaprint as a *reference for UX patterns and interaction quality*, not for literal copying of layout, copy, or visual assets.

**Branding:** Use the existing Apex Workwear identity — same logo, name, and brand voice as apexworkwear.ca. Reference their current site for logo asset, color usage, and tone (practical, GTA-local, small-business-friendly, "Proudly Canadian"). Elevate the visual execution and interactivity well beyond the current WordPress site, but keep it recognizably Apex Workwear.

**Design reference tool:** Mobbin MCP is available in this environment — use it to pull real, current UI/UX patterns (product cards, cart drawers, checkout flows, hover/scroll micro-interactions) rather than relying on memory or on Vistaprint alone. Reach for it specifically during Phase 1 (design system) and Phase 5 (storefront pages/animations) whenever a concrete pattern reference would sharpen a component beyond a generic implementation.

**Design/animation skills (use explicitly, don't leave to inference alone):**
- `design-taste-frontend` (Taste Skill) — apply during Phase 1 when establishing the design system, and again during Phase 5/7 as a pre-flight check before any storefront UI is considered done. Let it infer direction from this brief (trustworthy, GTA-local small-business print company) rather than forcing a specific style variant like brutalist.
- `emil-design-eng` and `animation-vocabulary` (emilkowalski/skills) — apply whenever building an interactive element (hover states, cart drawer, page transitions, option selectors) so easing/timing/motion choices are deliberate, not default.
- `pick-ui-library` (emilkowalski/skills) — apply before installing any UI/animation/toast/etc. package, so the agent picks a trusted library instead of hand-rolling or grabbing an abandoned one.
- `review-animations` and `find-animation-opportunities` (emilkowalski/skills) — apply during Phase 7 (Polish & QA) as an explicit audit pass over everything built.

---

## 2. Non-Negotiable Technical Constraints

- **Language: plain JavaScript only. No TypeScript, anywhere in the codebase.**
- **Framework:** Next.js (App Router)
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication
- **Media/image storage:** Cloudinary (NOT Firebase Storage — all product images, uploads, and admin-managed media go through Cloudinary)
- **Transactional email:** Resend API
- **Payments:** Stripe
- **Product data source:** SinaLite API — see full flow in Section 3
- **Product catalog cache:** Firestore (synced from SinaLite — see Section 3)
- **Style:** modern, highly interactive, smooth micro-animations on hover/scroll/state-change (use Framer Motion or similar) — this should feel noticeably more alive than a typical WooCommerce/WordPress storefront
- **Responsive:** fully responsive, mobile-first where practical

---

## 3. SinaLite API — How It Actually Works

Full reference: `https://v0-e-commerce-site-api.vercel.app/guide` — read this before building the sync layer, it documents the real request/response shapes.

Key facts your sync logic must account for:

- **No category endpoint exists.** The product list endpoint returns only `id`, `sku`/name, `category`, and `enabled` — nothing else, and no way to query by category server-side. **You must fetch the full product list and derive categories yourself** by grouping on the `category` field client-side/server-side during the sync job. Category pages and nav are built from this derived grouping, not from a live API call per category.
- **No description or images come from SinaLite at all.** Every product needs a description and image(s) added manually through the admin panel — SinaLite gives you nothing usable for merchandising.
- **Getting a priced, configured product takes two more calls after the base product:** first fetch that product's option groups (stock, size, qty, coating, turnaround, etc.), then a separate call to get a price for a specific combination of selected options. Never treat price as static — it must always be a live calculation based on the exact options selected.
- **Orders and shipping rates are also live calls**, made only server-side, never exposing SinaLite credentials to the client.

### Sync architecture (build this first — everything else depends on it)

1. **Sync logic lives in a Next.js API route** (e.g. `app/api/sync/route.js`, App Router route handler) — no separate Node.js service or standalone script. The route itself:
   - Fetches full product list from SinaLite
   - For each `enabled` product, fetches its option groups
   - Computes a default "starting from" price using the cheapest option in each group, calls the pricing endpoint once with that combo, stores the result
   - Upserts everything into Firestore under `products/{productId}`
   - **Merges, never overwrites:** admin-added fields (images, description, visibility, category override) must never be wiped by a sync run — only the SinaLite-sourced fields get replaced
   - Auto-flags new products with no images/description yet (`needsAttention: true`)
   - Auto-hides products SinaLite marks as `enabled: 0`
   - Logs every run (success/fail counts, errors) to `syncLogs/{syncId}`
2. **Trigger it two ways, both hitting the same route:**
   - **Scheduled:** a `vercel.json` Cron Job (Vercel Cron Jobs) configured to call the route weekly — this only works once the project is deployed on Vercel, since Vercel Cron triggers a scheduled HTTP request to the route.
   - **Manual:** the admin panel's "Sync Now" button calls the exact same route on demand.
   - Protect the route with a secret (e.g. a `CRON_SECRET` header/query param checked in the handler) so it can't be triggered by anyone who finds the URL.
3. **Category derivation:** during sync, collect the distinct `category` values across all fetched products and store/update a `categories` collection (or field) used to drive nav + category landing pages. Category pages query Firestore by this derived field — never call SinaLite live for category browsing.
4. **Live pricing stays live:** when a customer selects options on a product page, call SinaLite's pricing endpoint server-side, in real time. Never serve a cached number for a specific configured selection.

---

## 4. Firestore Data Model

```
products/{productId}
  sinalite: { sku, name, category, enabled, optionGroups }
  pricing: { startingPrice, defaultCombo, currency, priceLastSyncedAt }
  images: []              // Cloudinary URLs, admin-managed
  description: ""         // admin-managed
  isVisible: true
  needsAttention: true
  displayOrder: 0
  lastSyncedAt: timestamp

categories/{categorySlug}
  name, description, heroImage (Cloudinary), displayOrder

syncLogs/{syncId}
  startedAt, finishedAt, status, productsProcessed, productsFailed, errors: []

users/{userId}
  name, email, addresses: [], createdAt

orders/{orderId}
  userId (or null for guest), items: [], shippingAddress, billingAddress,
  stripePaymentIntentId, sinaliteOrderId, status, totals, createdAt
```

---

## 5. Site Map

- **Home** — hero, featured categories, best-sellers, trust signals (Canadian-made, fast turnaround, etc.), testimonials — pull tone/structure from apexworkwear.ca's existing homepage sections but redesign visually
- **About** — company story, why-choose-us, based on Apex Workwear's existing "About Us" content
- **Contact** — contact form (sends via Resend), phone/email, business info
- **Category pages** — dynamic route, e.g. `/products/[category]`, product grid filtered from the Firestore-synced catalog (derived category field, not a live SinaLite call)
- **Product detail page** — images, description, live option selector → live price, add to cart
- **Cart**
- **Checkout** — shipping/billing form, live shipping rate lookup, Stripe payment
- **Order confirmation**
- **Account area** — login/register (Firebase Auth), order history, saved addresses, profile
- **Admin panel** (auth-protected, role-gated) — see Section 6

---

## 6. Admin Panel

- **Product list** — synced products, sync status, `needsAttention` flags, visibility toggle
- **Product editor** — Cloudinary image upload, description editor, category override, visibility toggle, manual starting-price override
- **Sync dashboard** — last sync time, manual "Sync Now" trigger, run history, error log
- **Order management** — view orders, statuses, customer/shipping details
- **Category management** — edit category display name, hero image, description, ordering

---

## 7. Phased Build Plan

Build and verify each phase fully before starting the next.

### Phase 1 — Foundation
- Next.js (JavaScript) project scaffold, folder structure, environment config
- Firebase project connected (Firestore + Auth)
- Cloudinary connected
- Base design system: colors/typography pulled from Apex Workwear branding, component library setup, animation approach chosen

### Phase 2 — SinaLite Sync Engine
- Auth flow (OAuth client-credentials) against SinaLite
- Product list + option group fetch
- Default-combo pricing computation
- Firestore upsert with safe-merge logic
- Category derivation from synced data
- Scheduled job + manual trigger + sync logging

### Phase 3 — Accounts
- Firebase Auth: register/login/logout, password reset
- Account dashboard: profile, saved addresses, order history (empty state until Phase 6 orders exist)

### Phase 4 — Admin Panel
- Admin auth/role gating
- Product list + editor (Cloudinary uploads, description, visibility, category override)
- Sync dashboard (manual trigger, logs)
- Category management

### Phase 5 — Public Storefront Core Pages
- Home, About, Contact (Resend-powered contact form)
- Category landing pages (from Firestore, derived categories)
- Product detail page with live option selection → live SinaLite price call
- Micro-animations across nav, product cards, page transitions, hover states

### Phase 6 — Cart, Checkout, Orders
- Cart (persisted per session/account)
- Checkout: shipping/billing form, live SinaLite shipping rate lookup, Stripe payment
- On successful payment: submit order to SinaLite (server-side), write to `orders` collection, send confirmation email via Resend
- Order confirmation page + order appears in account order history
- Admin order management view

### Phase 7 — Polish & QA
- Run `design-taste-frontend` pre-flight check and `review-animations` / `find-animation-opportunities` as an explicit audit pass over the built storefront
- Full responsive pass
- Animation/interaction polish
- End-to-end test: browse → configure → price → cart → checkout → payment → order confirmation → admin sees it
- Performance pass (image optimization via Cloudinary transforms, lazy loading, etc.)

---

## 8. Explicitly Out of Scope for This Build (Phase 2 of the overall project — do not build now)

- **Apparel category/products** (t-shirts, hoodies, hats, embroidery, DTG, sizing/color variants) — even though Apex Workwear's current site sells apparel, this build is print-products-only
- **Built-in template/design customization tool** (canvas-based editor for customer-created designs)
- **Premade design templates library**

Do not scaffold placeholder pages/routes for these — they belong to a separate future phase with its own spec.

---

## 9. Before You Start

If anything about the SinaLite response shapes, Firebase project config, Cloudinary credentials, Stripe keys, or Resend setup isn't available or is ambiguous once you read the API guide, stop and ask rather than guessing or stubbing with placeholder logic that looks functional but isn't.