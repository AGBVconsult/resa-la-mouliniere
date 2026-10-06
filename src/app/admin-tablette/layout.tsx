import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Montserrat } from "next/font/google";
import { TabletLayoutClient } from "./components/TabletLayoutClient";

// Police de l'interface tablette
const montserrat = Montserrat({ subsets: ["latin"], display: "swap" });

export const metadata = {
  title: "Admin Tablette - La Moulinière",
  description: "Interface tablette d'administration La Moulinière",
  manifest: "/admin-tablette-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LM Tablette",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

export default async function AdminTabletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  return <TabletLayoutClient fontClassName={montserrat.className}>{children}</TabletLayoutClient>;
}
