import { auth, clerkClient } from "@clerk/nextjs/server";
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

const ALLOWED_ROLES = ["admin", "owner", "staff"];

export default async function AdminMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/admin/login");
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const userRole = (user.publicMetadata?.role as string | undefined)?.toLowerCase();

  if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
    redirect("/admin/access-denied");
  }

  return <MobileLayoutClient>{children}</MobileLayoutClient>;
}
