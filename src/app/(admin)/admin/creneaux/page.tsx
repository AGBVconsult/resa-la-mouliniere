"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { ServicePanel } from "./components/ServicePanel";
import { Loader2, AlertTriangle, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

function ProgressiveFillingSettings() {
  const settings = useQuery(api.admin.getSettings);
  const updateProgressiveFilling = useMutation(api.admin.updateProgressiveFilling);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [lunchThreshold, setLunchThreshold] = useState("13:00");
  const [dinnerThreshold, setDinnerThreshold] = useState("19:00");
  const [minFillPercent, setMinFillPercent] = useState(20);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings?.progressiveFilling) {
      setEnabled(settings.progressiveFilling.enabled);
      setLunchThreshold(settings.progressiveFilling.lunchThreshold);
      setDinnerThreshold(settings.progressiveFilling.dinnerThreshold);
      setMinFillPercent(settings.progressiveFilling.minFillPercent);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProgressiveFilling({
        enabled,
        lunchThreshold,
        dinnerThreshold,
        minFillPercent,
      });
    } catch (err) {
      console.error("Error saving progressive filling settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = settings?.progressiveFilling && (
    enabled !== settings.progressiveFilling.enabled ||
    lunchThreshold !== settings.progressiveFilling.lunchThreshold ||
    dinnerThreshold !== settings.progressiveFilling.dinnerThreshold ||
    minFillPercent !== settings.progressiveFilling.minFillPercent
  );

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-base">Remplissage progressif</CardTitle>
            {enabled && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                Actif
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Masque automatiquement les créneaux tardifs si le créneau précédent n'a pas atteint le taux de remplissage minimum.
            Cela permet de concentrer les réservations en début de service.
          </p>

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="pf-enabled" className="font-medium">
              Activer le remplissage progressif
            </Label>
            <Switch
              id="pf-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {enabled && (
            <div className="space-y-4 pt-2 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lunch-threshold" className="text-sm">
                    Seuil déjeuner
                  </Label>
                  <Input
                    id="lunch-threshold"
                    type="time"
                    value={lunchThreshold}
                    onChange={(e) => setLunchThreshold(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Créneaux ≥ ce seuil nécessitent un remplissage du précédent
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dinner-threshold" className="text-sm">
                    Seuil dîner
                  </Label>
                  <Input
                    id="dinner-threshold"
                    type="time"
                    value={dinnerThreshold}
                    onChange={(e) => setDinnerThreshold(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Créneaux ≥ ce seuil nécessitent un remplissage du précédent
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min-fill" className="text-sm">
                  Taux de remplissage minimum ({minFillPercent}%)
                </Label>
                <Input
                  id="min-fill"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={minFillPercent}
                  onChange={(e) => setMinFillPercent(parseInt(e.target.value, 10))}
                  className="w-full"
                />
                <p className="text-xs text-slate-500">
                  Le créneau précédent doit avoir au moins {minFillPercent}% de sa capacité réservée
                </p>
              </div>
            </div>
          )}

          {hasChanges && (
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function CreneauxPage() {
  const templates = useQuery(api.weeklyTemplates.list);

  if (templates === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (templates === null) {
    return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardContent className="flex items-center gap-4 pt-6">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <div>
            <p className="font-medium text-slate-900">Accès refusé</p>
            <p className="text-sm text-slate-600">
              Vous devez avoir le rôle admin ou owner pour accéder à cette page.
              Configurez votre rôle dans Clerk (publicMetadata.role = "owner").
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuration des créneaux</h1>
        <p className="text-slate-600">Gérez les horaires d'ouverture et les créneaux de réservation</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ServicePanel
          service="lunch"
          title="Déjeuner"
          templates={templates.filter((t) => t.service === "lunch")}
        />
        <ServicePanel
          service="dinner"
          title="Dîner"
          templates={templates.filter((t) => t.service === "dinner")}
        />
      </div>

      <ProgressiveFillingSettings />
    </div>
  );
}
