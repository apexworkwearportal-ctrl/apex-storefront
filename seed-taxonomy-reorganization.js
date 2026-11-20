const fs = require('fs');
const path = require('path');
const { getApps, initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Load credentials
const localEnvPath = path.join(__dirname, '.env.local');
let env = {};
try {
  const content = fs.readFileSync(localEnvPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
    if (match) {
      env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    }
  });
} catch (e) {
  console.error("Could not load .env.local:", e.message);
}

const serviceAccountKey = env.FIREBASE_SERVICE_ACCOUNT_KEY;
let app;
if (serviceAccountKey) {
  let config;
  if (serviceAccountKey.startsWith("{")) {
    config = JSON.parse(serviceAccountKey);
  } else {
    const decoded = Buffer.from(serviceAccountKey, "base64").toString("utf-8");
    config = JSON.parse(decoded);
  }
  app = initializeApp({ credential: cert(config) });
} else {
  app = initializeApp({ projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "apex-workwear" });
}

const db = getFirestore(app);

// Parent Categories (Level 1)
const PARENTS = [
  {
    id: "business-cards-stationery",
    name: "Business Cards & Stationery",
    displayOrder: 1,
    description: "Business cards, letterhead, envelopes, and everyday office essentials like notepads and NCR forms. Configure your stock, finish, and quantity, then see wholesale pricing instantly.",
    faqs: [
      { q: "What cardstock weights do you offer?", a: "14pt and 16pt, in matte, gloss, or soft touch finish." },
      { q: "Is there a minimum order on business cards?", a: "No, order as few or as many as you need." },
      { q: "Can I order letterhead and envelopes together?", a: "Yes, configure them separately and they will ship together." }
    ]
  },
  {
    id: "marketing-direct-mail",
    name: "Marketing & Direct Mail",
    displayOrder: 2,
    description: "Flyers, brochures, postcards, and door hangers for campaigns of any size. Same-day options available on select items, with per-unit pricing that drops as your order grows.",
    faqs: [
      { q: "How fast is flyer and brochure printing?", a: "Same-day options are available on both." },
      { q: "What sizes do postcards come in?", a: "4x6, 5x7, and 6x9, standard or specialty finish." },
      { q: "Do you offer bulk pricing on door hangers?", a: "Yes, per-unit pricing drops automatically at higher quantities." }
    ]
  },
  {
    id: "signs-banners",
    name: "Signs & Banners",
    displayOrder: 3,
    description: "Yard signs, A-frame signs, vinyl banners, and rigid signage for storefronts, job sites, and events across the GTA. Every order is finished locally in Ontario.",
    faqs: [
      { q: "What sizes do coroplast yard signs come in?", a: "All standard sizes, single or double sided." },
      { q: "Are your signs weatherproof?", a: "Yes, coroplast, aluminum, and vinyl banner options are all built for outdoor use." },
      { q: "Do you sell the stakes separately?", a: "Yes, H-stakes can be bundled with your sign order or purchased on their own." }
    ]
  },
  {
    id: "vinyl-decals-graphics",
    name: "Vinyl, Decals & Graphics",
    displayOrder: 4,
    description: "Wall graphics, window decals, vehicle magnets, and floor graphics for branding any surface. Removable and permanent options available depending on the application.",
    faqs: [
      { q: "Are wall decals removable?", a: "Yes, without damaging paint or wallpaper." },
      { q: "Can I get vehicle magnets in a custom shape?", a: "Configure your size and shape during checkout." },
      { q: "What's the difference between a cling and a decal?", a: "Clings use static or light adhesive and remove without residue, decals use stronger adhesive for longer-term placement." }
    ]
  },
  {
    id: "labels-packaging",
    name: "Labels & Packaging",
    displayOrder: 5,
    description: "Custom roll and sheet labels, pouches, and shipping boxes for product lines of any size. Configure your material and finish, then order online.",
    faqs: [
      { q: "What's the difference between roll and square cut labels?", a: "Roll labels are for machine application, square cut are individually cut sheets." },
      { q: "Do you print custom shipping boxes?", a: "Yes, configure your size and print on the outer surface." },
      { q: "Is there a minimum order on labels?", a: "No minimum on most sizes." }
    ]
  },
  {
    id: "cards-invitations-calendars",
    name: "Cards, Invitations & Calendars",
    displayOrder: 6,
    description: "Greeting cards, invitations, wall calendars, and specialty prints for corporate mailings and personal occasions alike.",
    faqs: [
      { q: "Can I order a single greeting card?", a: "Yes, no minimum order." },
      { q: "What sizes do wall calendars come in?", a: "Configure your size and page count during checkout." },
      { q: "Do you offer foil or embossed finishes?", a: "Yes, on Specialty Greeting Cards and Specialty Business Cards." }
    ]
  },
  {
    id: "apparel-promotional-wear",
    name: "Apparel & Promotional Wear",
    displayOrder: 7,
    description: "Custom t-shirts, hoodies, headwear, and embroidered apparel for teams, staff, and merch runs. Screen printing and DTG both available, no setup fees on DTG orders.",
    faqs: [
      { q: "What's the difference between screen printing and DTG?", a: "Screen printing is more cost effective at higher volumes, DTG has no setup fees and suits smaller or highly detailed runs." },
      { q: "Is there a minimum order on t-shirts?", a: "Configure your quantity, low minimums apply." },
      { q: "Do you offer embroidery on hoodies?", a: "Yes, available as an alternative to printed logos." }
    ]
  }
];

// Subcategories (Level 2)
const SUBCATEGORIES = [
  // 1. Business Cards & Stationery
  { id: "sub-business-cards", parentId: "business-cards-stationery", name: "Business Cards", displayOrder: 1, description: "14pt to 16pt cardstock in matte, gloss, or soft touch finishes. The most ordered item in our catalogue, with same-day options available.", related: ["Specialty Business Cards", "Folded Business Cards", "Letterhead & Envelopes"] },
  { id: "sub-letterhead-envelopes", parentId: "business-cards-stationery", name: "Letterhead & Envelopes", displayOrder: 2, description: "Premium uncoated stock for professional correspondence. Order letterhead and envelopes together for a matched set.", related: ["Business Cards", "Presentation Folders", "Forms & Notepads"] },
  { id: "sub-forms-notepads", parentId: "business-cards-stationery", name: "Forms & Notepads", displayOrder: 3, description: "Carbonless NCR forms and branded notepads for everyday office use. Numbering available on request.", related: ["Letterhead & Envelopes", "Business Cards", "Labels & Stickers"] },
  { id: "sub-presentation-folders", parentId: "business-cards-stationery", name: "Presentation Folders", displayOrder: 4, description: "Pocket folders built to hold a full page set, ideal for proposals and client onboarding.", related: ["Letterhead & Envelopes", "Business Cards", "Flyers & Brochures"] },

  // 2. Marketing & Direct Mail
  { id: "sub-flyers-brochures", parentId: "marketing-direct-mail", name: "Flyers & Brochures", displayOrder: 1, description: "Single or double sided flyers, bi-fold and tri-fold brochures, booklets, and bookmarks. Same-day printing available on flyers and brochures.", related: ["Postcards", "Door-to-Door & Handouts", "Presentation Folders"] },
  { id: "sub-postcards", parentId: "marketing-direct-mail", name: "Postcards", displayOrder: 2, description: "4x6, 5x7, and 6x9 postcards for direct mail and real estate listings, in standard or specialty finishes.", related: ["Flyers & Brochures", "Door-to-Door & Handouts", "Greeting Cards & Invitations"] },
  { id: "sub-door-to-door-handouts", parentId: "marketing-direct-mail", name: "Door-to-Door & Handouts", displayOrder: 3, description: "Door hangers, rack cards, and tear cards built for local, neighbourhood-level marketing.", related: ["Flyers & Brochures", "Postcards", "Yard & Lawn Signs"] },

  // 3. Signs & Banners
  { id: "sub-yard-lawn-signs", parentId: "signs-banners", name: "Yard & Lawn Signs", displayOrder: 1, description: "Weatherproof coroplast signs in every standard size, with wire H-stakes sold separately or bundled.", related: ["Sidewalk & A-Frame Signs", "Rigid & Permanent Signage", "Door-to-Door & Handouts"] },
  { id: "sub-sidewalk-a-frame-signs", parentId: "signs-banners", name: "Sidewalk & A-Frame Signs", displayOrder: 2, description: "Reusable A-frame stands and sandwich board signage for storefronts and sidewalks, visible from both sides.", related: ["Yard & Lawn Signs", "Banners & Banner Stands", "Point-of-Purchase Displays"] },
  { id: "sub-rigid-permanent-signage", parentId: "signs-banners", name: "Rigid & Permanent Signage", displayOrder: 3, description: "Aluminum, styrene, foam board, and rigid PVC for signage that needs to last outdoors long term.", related: ["Yard & Lawn Signs", "Safety & Compliance Decals", "Wall & Window Graphics"] },
  { id: "sub-banners-banner-stands", parentId: "signs-banners", name: "Banners & Banner Stands", displayOrder: 4, description: "Vinyl banners, retractable pull-up stands, and lightweight X-frame banners for events and storefronts.", related: ["Sidewalk & A-Frame Signs", "Point-of-Purchase Displays", "Posters & Large Format Prints"] },
  { id: "sub-posters-large-format-prints", parentId: "signs-banners", name: "Posters & Large Format Prints", displayOrder: 5, description: "High resolution posters up to wide-format sizes for retail, offices, and events.", related: ["Banners & Banner Stands", "Point-of-Purchase Displays", "Canvas (Calendars & Specialty Prints)"] },
  { id: "sub-point-of-purchase-displays", parentId: "signs-banners", name: "Point-of-Purchase Displays", displayOrder: 6, description: "Display boards and table covers built to catch attention at checkout counters and trade shows.", related: ["Banners & Banner Stands", "Sidewalk & A-Frame Signs", "Posters & Large Format Prints"] },

  // 4. Vinyl, Decals & Graphics
  { id: "sub-wall-window-graphics", parentId: "vinyl-decals-graphics", name: "Wall & Window Graphics", displayOrder: 1, description: "Adhesive vinyl, wall decals, and window graphics for storefronts, offices, and retail spaces.", related: ["Static Clings", "Floor Graphics", "Rigid & Permanent Signage"] },
  { id: "sub-floor-graphics", parentId: "vinyl-decals-graphics", name: "Floor Graphics", displayOrder: 2, description: "Slip-resistant floor decals for wayfinding, promotions, and safety markings.", related: ["Wall & Window Graphics", "Safety & Compliance Decals", "Point-of-Purchase Displays"] },
  { id: "sub-vehicle-promotional-magnets", parentId: "vinyl-decals-graphics", name: "Vehicle & Promotional Magnets", displayOrder: 3, description: "Removable magnetic signage for vehicles, plus smaller promotional and business card magnets.", related: ["Static Clings", "Wall & Window Graphics", "Business Cards"] },
  { id: "sub-static-clings", parentId: "vinyl-decals-graphics", name: "Static Clings", displayOrder: 4, description: "Static and adhesive window clings for storefronts and vehicles, with no residue on removal.", related: ["Wall & Window Graphics", "Vehicle & Promotional Magnets", "Floor Graphics"] },
  { id: "sub-safety-compliance-decals", parentId: "vinyl-decals-graphics", name: "Safety & Compliance Decals", displayOrder: 5, description: "Warning, safety, and compliance decals for job sites and commercial spaces.", related: ["Rigid & Permanent Signage", "Floor Graphics", "Yard & Lawn Signs"] },

  // 5. Labels & Packaging
  { id: "sub-labels-stickers", parentId: "labels-packaging", name: "Labels & Stickers", displayOrder: 1, description: "Custom roll and square-cut labels for product packaging, bottling, and shipping.", related: ["Packaging", "Vehicle & Promotional Magnets", "Forms & Notepads"] },
  { id: "sub-packaging", parentId: "labels-packaging", name: "Packaging", displayOrder: 2, description: "Custom printed pouches and branded shipping boxes for product lines of any size.", related: ["Labels & Stickers", "Wall & Window Graphics", "Forms & Notepads"] },

  // 6. Cards, Invitations & Calendars
  { id: "sub-greeting-cards-invitations", parentId: "cards-invitations-calendars", name: "Greeting Cards & Invitations", displayOrder: 1, description: "Custom greeting cards and invitations for corporate mailings, weddings, and celebrations.", related: ["Event & Table Cards", "Postcards", "Calendars & Specialty Prints"] },
  { id: "sub-event-table-cards", parentId: "cards-invitations-calendars", name: "Event & Table Cards", displayOrder: 2, description: "Table tent cards for menus, table numbers, and event signage.", related: ["Greeting Cards & Invitations", "Point-of-Purchase Displays", "Flyers & Brochures"] },
  { id: "sub-calendars-specialty-prints", parentId: "cards-invitations-calendars", name: "Calendars & Specialty Prints", displayOrder: 3, description: "Wall calendars, canvas prints, and short-run digital sheets for specialty and promotional use.", related: ["Greeting Cards & Invitations", "Posters & Large Format Prints", "Presentation Folders"] },

  // 7. Apparel & Promotional Wear
  { id: "sub-t-shirts", parentId: "apparel-promotional-wear", name: "T-Shirts", displayOrder: 1, description: "Screen printed or DTG t-shirts in bulk or single runs, with dozens of colours and blank brands available.", related: ["Hoodies & Sweatshirts", "Embroidered Apparel", "Headwear"] },
  { id: "sub-hoodies-sweatshirts", parentId: "apparel-promotional-wear", name: "Hoodies & Sweatshirts", displayOrder: 2, description: "Pullover and zip-up hoodies with embroidered or printed logos, built for teams and staff.", related: ["T-Shirts", "Embroidered Apparel", "Headwear"] },
  { id: "sub-headwear", parentId: "apparel-promotional-wear", name: "Headwear", displayOrder: 3, description: "Embroidered hats and caps with low minimums and fast turnaround.", related: ["T-Shirts", "Hoodies & Sweatshirts", "Embroidered Apparel"] },
  { id: "sub-embroidered-apparel", parentId: "apparel-promotional-wear", name: "Embroidered Apparel", displayOrder: 4, description: "Precision logo embroidery on polos and other apparel, popular for corporate uniforms.", related: ["Hoodies & Sweatshirts", "Headwear", "T-Shirts"] }
];

// Leaf Category mapping: maps Leaf Category Document IDs to their Level 2 Subcategory ID
const LEAF_MAPPING = {
  // 1. Business Cards & Stationery
  "business-cards": { parentId: "sub-business-cards", displayOrder: 1 },
  "specialty-business-cards": { parentId: "sub-business-cards", displayOrder: 2 },
  "folded-business-cards": { parentId: "sub-business-cards", displayOrder: 3 },
  "letterhead": { parentId: "sub-letterhead-envelopes", displayOrder: 1 },
  "envelopes": { parentId: "sub-letterhead-envelopes", displayOrder: 2 },
  "ncr-forms": { parentId: "sub-forms-notepads", displayOrder: 1 },
  "notepads": { parentId: "sub-forms-notepads", displayOrder: 2 },
  "presentation-folders": { parentId: "sub-presentation-folders", displayOrder: 1 },

  // 2. Marketing & Direct Mail
  "flyers": { parentId: "sub-flyers-brochures", displayOrder: 1 },
  "brochures": { parentId: "sub-flyers-brochures", displayOrder: 2 },
  "booklets": { parentId: "sub-flyers-brochures", displayOrder: 3 },
  "bookmarks": { parentId: "sub-flyers-brochures", displayOrder: 4 },
  "postcards": { parentId: "sub-postcards", displayOrder: 1 },
  "specialty-post-cards": { parentId: "sub-postcards", displayOrder: 2 },
  "door-hangers": { parentId: "sub-door-to-door-handouts", displayOrder: 1 },
  "rack-cards": { parentId: "sub-door-to-door-handouts", displayOrder: 2 },
  "tear-cards": { parentId: "sub-door-to-door-handouts", displayOrder: 3 },

  // 3. Signs & Banners
  "coroplast-signs-yard-signs": { parentId: "sub-yard-lawn-signs", displayOrder: 1 },
  "h-stands-for-signs": { parentId: "sub-yard-lawn-signs", displayOrder: 2 },
  "a-frame-signs": { parentId: "sub-sidewalk-a-frame-signs", displayOrder: 1 },
  "a-frame-stands": { parentId: "sub-sidewalk-a-frame-signs", displayOrder: 2 },
  "aluminum-signs": { parentId: "sub-rigid-permanent-signage", displayOrder: 1 },
  "styrene-signs": { parentId: "sub-rigid-permanent-signage", displayOrder: 2 },
  "foam-board": { parentId: "sub-rigid-permanent-signage", displayOrder: 3 },
  "sintrarigid-board": { parentId: "sub-rigid-permanent-signage", displayOrder: 4 },
  "vinyl-banners": { parentId: "sub-banners-banner-stands", displayOrder: 1 },
  "pull-up-banners": { parentId: "sub-banners-banner-stands", displayOrder: 2 },
  "x-frame-banners": { parentId: "sub-banners-banner-stands", displayOrder: 3 },
  "large-format-posters": { parentId: "sub-posters-large-format-prints", displayOrder: 1 },
  "posters": { parentId: "sub-posters-large-format-prints", displayOrder: 2 },
  "display-board-pop": { parentId: "sub-point-of-purchase-displays", displayOrder: 1 },
  "table-covers": { parentId: "sub-point-of-purchase-displays", displayOrder: 2 },

  // 4. Vinyl, Decals & Graphics
  "adhesive-vinyl": { parentId: "sub-wall-window-graphics", displayOrder: 1 },
  "wall-decals": { parentId: "sub-wall-window-graphics", displayOrder: 2 },
  "window-graphics": { parentId: "sub-wall-window-graphics", displayOrder: 3 },
  "floor-graphics": { parentId: "sub-floor-graphics", displayOrder: 1 },
  "car-magnets": { parentId: "sub-vehicle-promotional-magnets", displayOrder: 1 },
  "magnets": { parentId: "sub-vehicle-promotional-magnets", displayOrder: 2 },
  "clings": { parentId: "sub-static-clings", displayOrder: 1 },
  "safety-compliance-decals": { parentId: "sub-safety-compliance-decals", displayOrder: 1 },

  // 5. Labels & Packaging
  "roll-labels-stickers": { parentId: "sub-labels-stickers", displayOrder: 1 },
  "square-cut-labels-stickers": { parentId: "sub-labels-stickers", displayOrder: 2 },
  "pouch-packaging": { parentId: "sub-packaging", displayOrder: 1 },
  "supply-boxes": { parentId: "sub-packaging", displayOrder: 2 },

  // 6. Cards, Invitations & Calendars
  "greeting-cards": { parentId: "sub-greeting-cards-invitations", displayOrder: 1 },
  "specialty-greeting-cards": { parentId: "sub-greeting-cards-invitations", displayOrder: 2 },
  "invitations": { parentId: "sub-greeting-cards-invitations", displayOrder: 3 },
  "tent-cards": { parentId: "sub-event-table-cards", displayOrder: 1 },
  "wall-calendars": { parentId: "sub-calendars-specialty-prints", displayOrder: 1 },
  "canvas": { parentId: "sub-calendars-specialty-prints", displayOrder: 2 },
  "digital-sheets": { parentId: "sub-calendars-specialty-prints", displayOrder: 3 },
  "plastics": { parentId: "sub-calendars-specialty-prints", displayOrder: 4 },

  // 7. Apparel & Promotional Wear
  "t-shirts": { parentId: "sub-t-shirts", displayOrder: 1 },
  "hoodies-sweatshirts": { parentId: "sub-hoodies-sweatshirts", displayOrder: 1 },
  "headwear": { parentId: "sub-headwear", displayOrder: 1 },
  "embroidered-apparel": { parentId: "sub-embroidered-apparel", displayOrder: 1 }
};

async function run() {
  console.log("=== STARTING APEX CATEGORY TAXONOMY MIGRATION ===");

  try {
    // 1. Create Parent Categories (Level 1)
    console.log("\n-> Creating / Updating Parent Categories...");
    for (const parent of PARENTS) {
      const docRef = db.collection("categories").doc(parent.id);
      await docRef.set({
        name: parent.name,
        displayOrder: parent.displayOrder,
        description: parent.description,
        faqs: parent.faqs,
        parentId: null,
        isVisible: true,
        showOnHome: true
      }, { merge: true });
      console.log(`   [OK] Parent Category: "${parent.name}" (${parent.id})`);
    }

    // 2. Create Subcategories (Level 2)
    console.log("\n-> Creating / Updating Level 2 Subcategories...");
    for (const sub of SUBCATEGORIES) {
      const docRef = db.collection("categories").doc(sub.id);
      await docRef.set({
        name: sub.name,
        parentId: sub.parentId,
        displayOrder: sub.displayOrder,
        description: sub.description,
        related: sub.related,
        isVisible: true,
        showOnHome: false
      }, { merge: true });
      console.log(`   [OK] Subcategory: "${sub.name}" (${sub.id})`);
    }

    // 3. Database Cleanup: Merge, Rename, Delete old documents
    console.log("\n-> Executing Category Document Cleanup & Merges...");

    // Merge Coroplast Signs yard signs duplicate
    const oldCoroplast = "coroplast-signs-yard-signs-";
    const cleanCoroplast = "coroplast-signs-yard-signs";
    console.log(`   [Merge] Merging products of "${oldCoroplast}" to "${cleanCoroplast}"...`);
    const coroplastProds = await db.collection("products").where("categoryId", "==", oldCoroplast).get();
    for (const prod of coroplastProds.docs) {
      await db.collection("products").doc(prod.id).update({ categoryId: cleanCoroplast });
      console.log(`      [Updated Product] ID: ${prod.id} set categoryId to "${cleanCoroplast}"`);
    }
    await db.collection("categories").doc(oldCoroplast).delete();
    console.log(`      [Deleted Category Doc] "${oldCoroplast}"`);

    // Merge Pull Up Banners duplicate
    const oldPullup = "pull-up-banners-";
    const cleanPullup = "pull-up-banners";
    console.log(`   [Merge] Merging products of "${oldPullup}" to "${cleanPullup}"...`);
    const pullupProds = await db.collection("products").where("categoryId", "==", oldPullup).get();
    for (const prod of pullupProds.docs) {
      await db.collection("products").doc(prod.id).update({ categoryId: cleanPullup });
      console.log(`      [Updated Product] ID: ${prod.id} set categoryId to "${cleanPullup}"`);
    }
    await db.collection("categories").doc(oldPullup).delete();
    console.log(`      [Deleted Category Doc] "${oldPullup}"`);

    // Rename Covid Decals to Safety compliance decals
    const oldCovid = "covid-19-decals-";
    const cleanSafety = "safety-compliance-decals";
    console.log(`   [Rename] Renaming "${oldCovid}" to "${cleanSafety}"...`);
    const covidDoc = await db.collection("categories").doc(oldCovid).get();
    if (covidDoc.exists) {
      const data = covidDoc.data();
      await db.collection("categories").doc(cleanSafety).set({
        ...data,
        name: "Safety & Compliance Decals"
      }, { merge: true });
      await db.collection("categories").doc(oldCovid).delete();
      console.log(`      [Renamed Category Doc] "${oldCovid}" -> "${cleanSafety}"`);
    } else {
      // Ensure it exists anyway
      await db.collection("categories").doc(cleanSafety).set({
        name: "Safety & Compliance Decals",
        isVisible: true,
        showOnHome: false
      }, { merge: true });
    }
    // Update products pointing to old covid category
    const covidProds = await db.collection("products").where("categoryId", "==", oldCovid).get();
    for (const prod of covidProds.docs) {
      await db.collection("products").doc(prod.id).update({ categoryId: cleanSafety });
      console.log(`      [Updated Product] ID: ${prod.id} set categoryId to "${cleanSafety}"`);
    }

    // Delete Quickship from taxonomy
    console.log("   [Delete] Deleting 'quickship' from category collection...");
    await db.collection("categories").doc("quickship").delete();
    console.log("      [Deleted Category Doc] 'quickship'");

    // 4. Update Leaf Categories (Level 3) with correct parentIds and displayOrders
    console.log("\n-> Organizing Existing Leaf Categories under Level 2 Subcategories...");
    const catSnap = await db.collection("categories").get();
    for (const doc of catSnap.docs) {
      const catId = doc.id;
      // Skip parents and subcategories
      if (PARENTS.some(p => p.id === catId) || SUBCATEGORIES.some(s => s.id === catId)) {
        continue;
      }

      const mapping = LEAF_MAPPING[catId];
      if (mapping) {
        await db.collection("categories").doc(catId).update({
          parentId: mapping.parentId,
          displayOrder: mapping.displayOrder,
          showOnHome: false // By default, only parent categories show on home
        });
        console.log(`   [Sorted Leaf] ID: "${catId}" set parentId to "${mapping.parentId}", displayOrder: ${mapping.displayOrder}`);
      } else {
        // Unmapped categories default to uncategorized or we leave them without parent
        console.log(`   [Skipped/Unmapped] ID: "${catId}" (Name: "${doc.data().name}")`);
      }
    }

    console.log("\n=== CATEGORY TAXONOMY MIGRATION COMPLETED SUCCESSFULLY ===");
  } catch (error) {
    console.error("Migration error:", error);
  }
}

run();
