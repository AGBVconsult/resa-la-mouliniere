import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TabletLayoutClient } from "./components/TabletLayoutClient";

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
  themeColor: "#0f172a",
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

  return <TabletLayoutClient>{children}</TabletLayoutClient>;
}
