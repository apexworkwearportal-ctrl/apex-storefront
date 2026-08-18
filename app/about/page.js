import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AboutClient from "@/components/AboutClient";

export const metadata = {
  title: "About Us | Apex Workwear Printing",
  description: "Learn about Apex Workwear, your local GTA printing partner delivering custom business cards, flyers, and yard signs directly to your door.",
};

export default function AboutPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header />
      <main style={{ flexGrow: 1 }}>
        <AboutClient />
      </main>
      <Footer />
    </div>
  );
}
