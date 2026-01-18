import { SignIn } from "@clerk/nextjs";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">La Moulinière</h1>
          <p className="text-slate-600 mt-2">Administration</p>
        </div>
        <SignIn 
          fallbackRedirectUrl="/admin"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg border border-slate-200",
            },
          }}
        />
      </div>
    </div>
  );
}
