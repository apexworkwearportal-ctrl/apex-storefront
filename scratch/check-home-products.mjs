import { adminDb } from "../lib/firebase-admin.js";

async function checkProducts() {
  if (!adminDb) {
    console.log("adminDb is null");
    return;
  }
  console.log("--- Checking Categories ---");
  const catSnap = await adminDb.collection("categories").get();
  catSnap.forEach(doc => {
    const data = doc.data();
    console.log(`Cat ID: ${doc.id}, Name: ${data.name}, showOnHome: ${data.showOnHome}`);
  });

  console.log("\n--- Checking Products ---");
  const prodSnap = await adminDb.collection("products").get();
  console.log(`Total Products: ${prodSnap.size}`);
  prodSnap.forEach(doc => {
    const data = doc.data();
    console.log(`Prod ID: ${doc.id}, Name: ${data.name}, categoryId: ${data.categoryId || data.category}, isVisible: ${data.isVisible}`);
  });
}

checkProducts().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
