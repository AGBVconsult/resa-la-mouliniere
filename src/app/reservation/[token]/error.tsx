"use client";

import { useEffect } from 'react';
import { AlertTriangle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReservationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Parser l'erreur Convex
  const errorData = (() => {
    try {
      return (error as unknown as { data?: { code?: string } })?.data;
    } catch {
      return null;
    }
  })();

  const errorCode = errorData?.code;

  useEffect(() => {
    console.error('Reservation error:', error);
  }, [error]);

  // Token invalide
  if (errorCode === 'TOKEN_INVALID') {
    return (
      <div className="max-w-md mx-auto p-6 text-center space-y-4">
        <XCircle className="w-16 h-16 text-red-500 mx-auto" />
        <h1 className="text-xl font-semibold text-red-700">Lien invalide</h1>
        <p className="text-gray-600">
          Ce lien de réservation n&apos;existe pas ou a déjà été utilisé.
        </p>
      </div>
    );
  }

  // Token expiré
  if (errorCode === 'TOKEN_EXPIRED') {
    return (
      <div className="max-w-md mx-auto p-6 text-center space-y-4">
        <Clock className="w-16 h-16 text-amber-500 mx-auto" />
        <h1 className="text-xl font-semibold text-amber-700">Lien expiré</h1>
        <p className="text-gray-600">
          Ce lien a expiré. Vous ne pouvez plus modifier cette réservation en ligne.
        </p>
        <p className="text-sm text-gray-500">
          Contactez le restaurant pour toute modification.
        </p>
      </div>
    );
  }

  // Erreur générique
  return (
    <div className="max-w-md mx-auto p-6 text-center space-y-4">
      <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
      <h1 className="text-xl font-semibold text-red-700">Une erreur est survenue</h1>
      <p className="text-gray-600">
        Impossible de charger votre réservation. Veuillez réessayer.
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
