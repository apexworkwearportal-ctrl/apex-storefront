const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "apex-workwear"
  });
}

const db = admin.firestore();

async function checkProducts() {
  console.log("--- Checking Categories ---");
  const catSnap = await db.collection("categories").get();
  catSnap.forEach(doc => {
    console.log(`Cat ID: ${doc.id}, Name: ${doc.data().name}, showOnHome: ${doc.data().showOnHome}`);
  });

  console.log("\n--- Checking Products ---");
  const prodSnap = await db.collection("products").get();
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
