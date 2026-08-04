import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata = {
  title: "Apex Workwear | Custom Printing Storefront",
  description: "Configure options, get instant pricing, and check out directly. High-quality print products from your local GTA partner.",
  metadataBase: new URL("https://apexworkwear.ca"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Apex Workwear | Custom Printing Storefront",
    description: "Get instant pricing on custom business cards, flyers, brochures, yard signs, and more.",
    url: "/",
    siteName: "Apex Workwear",
    locale: "en_CA",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
