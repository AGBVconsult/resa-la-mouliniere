import { auth, clerkClient } from "@clerk/nextjs/server";
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

const ALLOWED_ROLES = ["admin", "owner", "staff"];

export default async function AdminTabletLayout({
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

  return <TabletLayoutClient>{children}</TabletLayoutClient>;
}
