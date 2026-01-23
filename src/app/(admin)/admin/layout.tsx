import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
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
  const { userId } = await auth();

  if (!userId) {
    redirect("/admin/login");
  }

  // Récupérer le rôle depuis les publicMetadata de l'utilisateur Clerk
  // (les sessionClaims ne contiennent pas le rôle par défaut)
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const userRole = (user.publicMetadata?.role as string | undefined)?.toLowerCase();

  // Si l'utilisateur n'a pas de rôle autorisé, rediriger vers access-denied
  if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
    redirect("/admin/access-denied");
  }

  return (
    <AdminLayoutClient>
      {children}
    </AdminLayoutClient>
  );
}
