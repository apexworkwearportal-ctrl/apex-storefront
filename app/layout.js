import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import Script from "next/script";

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
        <meta name="google-site-verification" content="fvLxc1KiRo7veVXUV8Gdgb0NQGN6Le6nQ3lDNOrHgAA" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>
        {/* Google Tag Manager */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=GT-578B9MQH"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'GT-578B9MQH');
        `}</Script>
        <AuthProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
