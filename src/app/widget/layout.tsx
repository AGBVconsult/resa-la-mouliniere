import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Réserver une table - La Moulinière",
  description: "Réservez votre table au restaurant La Moulinière. Cuisine française traditionnelle à Chaumont-Gistoux.",
  keywords: ["restaurant", "réservation", "La Moulinière", "Chaumont-Gistoux", "cuisine française"],
  robots: { index: true, follow: true },
  openGraph: {
    title: "Réserver une table - La Moulinière",
    description: "Réservez votre table au restaurant La Moulinière",
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
    description: "Restaurant de cuisine française traditionnelle",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Rue de la Station 73",
      addressLocality: "Chaumont-Gistoux",
      postalCode: "1325",
      addressCountry: "BE",
    },
    servesCuisine: "French",
    priceRange: "€€",
    acceptsReservations: "True",
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
