import type { Metadata, Viewport } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Réserver une table - La Moulinière Ostende",
  description: "Réservez votre table à La Moulinière, restaurant de moules à Ostende depuis 2011. Plus de 40 préparations de moules fraîches de Zélande. Visserskaai 17, face au port de pêche.",
  keywords: ["restaurant", "réservation", "La Moulinière", "Ostende", "moules", "Zélande", "fruits de mer", "Visserskaai"],
  robots: { index: true, follow: true },
  openGraph: {
    title: "Réserver une table - La Moulinière Ostende",
    description: "Restaurant de moules à Ostende depuis 2011. Plus de 40 préparations uniques, moules fraîches de Zélande.",
    type: "website",
    locale: "fr_BE",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "La Moulinière",
    description: "Restaurant de moules à Ostende depuis 2011. Plus de 40 préparations de moules fraîches de Zélande, réalisées à la minute par le Chef Benjamin.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Visserskaai 17",
      addressLocality: "Ostende",
      postalCode: "8400",
      addressCountry: "BE",
    },
    servesCuisine: ["Seafood", "Belgian", "Mussels"],
    priceRange: "€€",
    acceptsReservations: "True",
    telephone: "+32 59 70 17 65",
    url: "https://resa.lamouliniere.be",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Google Analytics 4 */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-GN04SXNFL7"
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-GN04SXNFL7');
        `}
      </Script>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
