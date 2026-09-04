import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminProviders } from "@/components/providers/AdminProviders";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";

export const metadata = {
  title: "Admin - La Moulinière",
  description: "Interface d'administration La Moulinière",
  manifest: "/admin-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LM Admin",
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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminProviders session={session}>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </AdminProviders>
  );
}
