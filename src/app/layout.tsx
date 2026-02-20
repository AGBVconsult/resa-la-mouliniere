import type { Metadata } from "next";
import { Lato, Montserrat } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import "./globals.css";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
      <body
        className={`${lato.variable} ${montserrat.variable} antialiased font-sans`}
        suppressHydrationWarning
      >
        <SessionProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
