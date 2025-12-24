import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Réserver une table - La Moulinière",
  description: "Réservez votre table au restaurant La Moulinière",
};

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
