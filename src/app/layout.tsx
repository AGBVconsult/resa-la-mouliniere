import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import "./globals.css";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "La Moulinière - Réservation",
  description: "Système de réservation restaurant La Moulinière",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link 
          href="https://db.onlinewebfonts.com/c/838d13bb3d3a5bc89e0b045845b2e282?family=Transat+Text+W01+Black" 
          rel="stylesheet" 
          type="text/css"
        />
      </head>
      <body
        className={`${lato.variable} antialiased font-sans`}
        suppressHydrationWarning
      >
        <SessionProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
