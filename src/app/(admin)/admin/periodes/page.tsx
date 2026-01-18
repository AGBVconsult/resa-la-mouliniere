"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Loader2, AlertTriangle, DoorOpen, DoorClosed, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PeriodList } from "./components/PeriodList";
import { AddPeriodDialog } from "./components/AddPeriodDialog";

export default function PeriodesPage() {
  const periods = useQuery(api.specialPeriods.list, {});
  const [showAddOuverture, setShowAddOuverture] = useState(false);
  const [showAddFermeture, setShowAddFermeture] = useState(false);

  if (periods === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (periods === null) {
    return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardContent className="flex items-center gap-4 pt-6">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <div>
            <p className="font-medium text-slate-900">Accès refusé</p>
            <p className="text-sm text-slate-600">
              Vous devez avoir le rôle admin ou owner pour accéder à cette page.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter only active/future periods (endDate >= today)
  const today = new Date().toISOString().split("T")[0];
  const activePeriods = periods.filter((p) => p.endDate >= today);

  // Separate by type: "open"/"modified" = Ouvertures, "closed" = Fermetures
  const ouvertures = activePeriods.filter(
    (p) => p.applyRules.status === "open" || p.applyRules.status === "modified"
  );
  const fermetures = activePeriods.filter((p) => p.applyRules.status === "closed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Périodes spéciales</h1>
        <p className="text-slate-600">Gérez les ouvertures et fermetures exceptionnelles</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DoorOpen className="h-5 w-5 text-green-600" />
                <CardTitle className="text-base">Ouvertures</CardTitle>
              </div>
              <Button size="sm" onClick={() => setShowAddOuverture(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter une ouverture
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {ouvertures.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Aucune ouverture exceptionnelle
              </p>
            ) : (
              <PeriodList periods={ouvertures} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DoorClosed className="h-5 w-5 text-red-600" />
                <CardTitle className="text-base">Fermetures</CardTitle>
              </div>
              <Button size="sm" onClick={() => setShowAddFermeture(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter une fermeture
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {fermetures.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Aucune fermeture exceptionnelle
              </p>
            ) : (
              <PeriodList periods={fermetures} />
            )}
          </CardContent>
        </Card>
      </div>

      <AddPeriodDialog
        isOpen={showAddOuverture}
        onClose={() => setShowAddOuverture(false)}
        defaultType="ouverture"
      />
      <AddPeriodDialog
        isOpen={showAddFermeture}
        onClose={() => setShowAddFermeture(false)}
        defaultType="fermeture"
      />
    </div>
  );
}
