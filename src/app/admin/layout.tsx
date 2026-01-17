import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata = {
  title: "Admin - La Mouliniere",
  description: "Administration des reservations",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();

  // Redirect to sign-in if not authenticated
  if (!userId) {
    redirect("/sign-in");
  }

  // Check for admin/owner/staff role
  const role = sessionClaims?.metadata?.role as string | undefined;
  const allowedRoles = ["admin", "owner", "staff"];

  if (!role || !allowedRoles.includes(role)) {
    // User is authenticated but doesn't have the right role
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminNav />
      {/* Main content area - offset by sidebar width on desktop */}
      <main className="md:pl-64">
        <div className="container mx-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
