import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";

export const metadata = {
  title: "Admin - La Moulinière",
  description: "Interface d'administration La Moulinière",
};

const ALLOWED_ROLES = ["admin", "owner", "staff"];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/admin/login");
  }

  // Vérifier le rôle de l'utilisateur
  // Le rôle est stocké dans les metadata publiques Clerk (publicMetadata.role)
  const userRole = (sessionClaims?.metadata as { role?: string })?.role 
    || (sessionClaims?.publicMetadata as { role?: string })?.role
    || null;

  // Si l'utilisateur n'a pas de rôle autorisé, rediriger vers access-denied
  if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
    redirect("/admin/access-denied");
  }

  return (
    <AdminLayoutClient>
      <div className="min-h-screen bg-slate-50">
        <AdminSidebar />
        <div className="lg:pl-64">
          <AdminHeader />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </AdminLayoutClient>
  );
}
