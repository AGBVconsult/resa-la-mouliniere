import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { MobileLayoutClient } from "./components/MobileLayoutClient";

export const metadata = {
  title: "Admin Mobile - La Moulinière",
  description: "Interface mobile d'administration La Moulinière",
  manifest: "/admin-mobile-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LM Mobile",
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

export default async function AdminMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  return <MobileLayoutClient>{children}</MobileLayoutClient>;
}
