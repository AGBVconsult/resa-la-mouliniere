"use client";

import Link from "next/link";
import { ShieldX, ArrowLeft, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-8 h-8 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Accès refusé
        </h1>

        <p className="text-slate-600 mb-6">
          Vous n&apos;avez pas les permissions nécessaires pour accéder à
          l&apos;interface d&apos;administration.
        </p>

        <p className="text-sm text-slate-500 mb-8">
          Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, contactez
          l&apos;administrateur du restaurant.
        </p>

        <div className="flex flex-col gap-3">
          <Link href="/">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l&apos;accueil
            </Button>
          </Link>

          <Button
            variant="ghost"
            className="w-full text-slate-500"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Se déconnecter
          </Button>
        </div>
      </div>
    </div>
  );
}
