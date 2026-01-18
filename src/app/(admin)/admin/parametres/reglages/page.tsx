"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Building2, 
  Globe, 
  Calendar, 
  Users, 
  Clock, 
  Mail, 
  Bell,
  Save,
  RotateCcw,
  Loader2,
  History
} from "lucide-react";

export default function ReglagesPage() {
  const settings = useQuery(api.globalSettings.get);
  const history = useQuery(api.globalSettings.getHistory, { limit: 10 });
  const updateMutation = useMutation(api.globalSettings.update);
  const resetMutation = useMutation(api.globalSettings.resetToDefaults);

  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [localSettings, setLocalSettings] = useState<Record<string, any> | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Initialize local state when settings load
  if (settings && !localSettings) {
    setLocalSettings({ ...settings });
  }

  const handleChange = (key: string, value: any) => {
    setLocalSettings((prev) => prev ? { ...prev, [key]: value } : null);
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setLocalSettings((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        notifications: {
          ...prev.notifications,
          [key]: value,
        },
      };
    });
  };

  const handleSave = async () => {
    if (!localSettings || !settings) return;

    setIsSaving(true);
    try {
      // Calculate diff
      const updates: Record<string, any> = {};
      for (const [key, value] of Object.entries(localSettings)) {
        if (key === "_id" || key === "key") continue;
        if (JSON.stringify(value) !== JSON.stringify((settings as any)[key])) {
          updates[key] = value;
        }
      }

      if (Object.keys(updates).length > 0) {
        await updateMutation({ updates });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Êtes-vous sûr de vouloir restaurer les valeurs par défaut ?")) return;

    setIsResetting(true);
    try {
      await resetMutation();
      setLocalSettings(null); // Will reinitialize from query
    } catch (error) {
      console.error("Error resetting settings:", error);
    } finally {
      setIsResetting(false);
    }
  };

  if (!settings || !localSettings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Réglages Généraux</h1>
          <p className="text-slate-500 mt-1">Paramètres système du restaurant</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-4 w-4 mr-2" />
            Historique
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Restaurer
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </div>
      </div>

      {showHistory && history && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique des modifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((entry: any) => (
                <div key={entry._id} className="text-sm border-b pb-2">
                  <div className="flex justify-between text-slate-500">
                    <span>{entry.modifiedBy}</span>
                    <span>{new Date(entry.modifiedAt).toLocaleString("fr-BE")}</span>
                  </div>
                  <div className="mt-1">
                    {entry.changes.map((change: any, idx: number) => (
                      <span key={idx} className="text-slate-700">
                        {change.field}: {JSON.stringify(change.oldValue)} → {JSON.stringify(change.newValue)}
                        {idx < entry.changes.length - 1 && ", "}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Restaurant */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Restaurant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="restaurantName">Nom</Label>
              <Input
                id="restaurantName"
                value={localSettings.restaurantName}
                onChange={(e) => handleChange("restaurantName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={localSettings.address}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={localSettings.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+32 59 123 456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={localSettings.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Fuseau horaire</Label>
              <Input
                id="timezone"
                value={localSettings.timezone}
                onChange={(e) => handleChange("timezone", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Langues */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Langues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Langues du widget</Label>
              <div className="flex flex-wrap gap-2">
                {["nl", "fr", "en", "de", "it"].map((lang) => (
                  <Button
                    key={lang}
                    variant={localSettings.widgetLanguages?.includes(lang) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const current = localSettings.widgetLanguages || [];
                      const newLangs = current.includes(lang)
                        ? current.filter((l: string) => l !== lang)
                        : [...current, lang];
                      handleChange("widgetLanguages", newLangs);
                    }}
                  >
                    {lang.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="widgetDefaultLanguage">Langue par défaut</Label>
              <select
                id="widgetDefaultLanguage"
                className="w-full border rounded-md px-3 py-2"
                value={localSettings.widgetDefaultLanguage}
                onChange={(e) => handleChange("widgetDefaultLanguage", e.target.value)}
              >
                {["nl", "fr", "en", "de", "it"].map((lang) => (
                  <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Langue admin</Label>
              <Input value="FR (fixe)" disabled />
            </div>
          </CardContent>
        </Card>

        {/* Réservations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Réservations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultSlotCapacity">Capacité par défaut</Label>
                <Input
                  id="defaultSlotCapacity"
                  type="number"
                  min={1}
                  max={100}
                  value={localSettings.defaultSlotCapacity}
                  onChange={(e) => handleChange("defaultSlotCapacity", parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultReservationDurationMinutes">Durée (min)</Label>
                <Input
                  id="defaultReservationDurationMinutes"
                  type="number"
                  min={30}
                  max={240}
                  value={localSettings.defaultReservationDurationMinutes}
                  onChange={(e) => handleChange("defaultReservationDurationMinutes", parseInt(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minBookingDelayMinutes">Délai min (min)</Label>
                <Input
                  id="minBookingDelayMinutes"
                  type="number"
                  min={0}
                  max={1440}
                  value={localSettings.minBookingDelayMinutes}
                  onChange={(e) => handleChange("minBookingDelayMinutes", parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxBookingAdvanceMonths">Délai max (mois)</Label>
                <Input
                  id="maxBookingAdvanceMonths"
                  type="number"
                  min={1}
                  max={12}
                  value={localSettings.maxBookingAdvanceMonths}
                  onChange={(e) => handleChange("maxBookingAdvanceMonths", parseInt(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pendingThreshold">Seuil pending</Label>
                <Input
                  id="pendingThreshold"
                  type="number"
                  min={1}
                  max={50}
                  value={localSettings.pendingThreshold}
                  onChange={(e) => handleChange("pendingThreshold", parseInt(e.target.value))}
                />
                <p className="text-xs text-slate-500">&gt; X → pending</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="largeGroupThreshold">Seuil grand groupe</Label>
                <Input
                  id="largeGroupThreshold"
                  type="number"
                  min={2}
                  max={50}
                  value={localSettings.largeGroupThreshold}
                  onChange={(e) => handleChange("largeGroupThreshold", parseInt(e.target.value))}
                />
                <p className="text-xs text-slate-500">≥ X → filtrage</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactUsThreshold">Seuil contact</Label>
                <Input
                  id="contactUsThreshold"
                  type="number"
                  min={5}
                  max={100}
                  value={localSettings.contactUsThreshold}
                  onChange={(e) => handleChange("contactUsThreshold", parseInt(e.target.value))}
                />
                <p className="text-xs text-slate-500">&gt; X → message</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CRM */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              CRM
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vipThreshold">Seuil VIP (visites)</Label>
                <Input
                  id="vipThreshold"
                  type="number"
                  min={1}
                  max={100}
                  value={localSettings.vipThreshold}
                  onChange={(e) => handleChange("vipThreshold", parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regularThreshold">Seuil Régulier (visites)</Label>
                <Input
                  id="regularThreshold"
                  type="number"
                  min={1}
                  max={50}
                  value={localSettings.regularThreshold}
                  onChange={(e) => handleChange("regularThreshold", parseInt(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="badGuestThreshold">Seuil Bad Guest (no-shows)</Label>
                <Input
                  id="badGuestThreshold"
                  type="number"
                  min={1}
                  max={10}
                  value={localSettings.badGuestThreshold}
                  onChange={(e) => handleChange("badGuestThreshold", parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataRetentionYears">Conservation (années)</Label>
                <Input
                  id="dataRetentionYears"
                  type="number"
                  min={1}
                  max={10}
                  value={localSettings.dataRetentionYears}
                  onChange={(e) => handleChange("dataRetentionYears", parseInt(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* No-Show */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              No-Show
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="noShowDelayMinutes">Délai marquage (min)</Label>
                <Input
                  id="noShowDelayMinutes"
                  type="number"
                  min={15}
                  max={120}
                  value={localSettings.noShowDelayMinutes}
                  onChange={(e) => handleChange("noShowDelayMinutes", parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noShowAlertThreshold">Alerte récidiviste</Label>
                <Input
                  id="noShowAlertThreshold"
                  type="number"
                  min={1}
                  max={10}
                  value={localSettings.noShowAlertThreshold}
                  onChange={(e) => handleChange("noShowAlertThreshold", parseInt(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emails */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Emails
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="senderEmail">Email expéditeur</Label>
                <Input
                  id="senderEmail"
                  type="email"
                  value={localSettings.senderEmail}
                  onChange={(e) => handleChange("senderEmail", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senderName">Nom expéditeur</Label>
                <Input
                  id="senderName"
                  value={localSettings.senderName}
                  onChange={(e) => handleChange("senderName", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reminderTimeMidi">Rappel midi</Label>
                <Input
                  id="reminderTimeMidi"
                  type="time"
                  value={localSettings.reminderTimeMidi}
                  onChange={(e) => handleChange("reminderTimeMidi", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reminderTimeSoir">Rappel soir</Label>
                <Input
                  id="reminderTimeSoir"
                  type="time"
                  value={localSettings.reminderTimeSoir}
                  onChange={(e) => handleChange("reminderTimeSoir", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewSendTime">Envoi avis</Label>
                <Input
                  id="reviewSendTime"
                  type="time"
                  value={localSettings.reviewSendTime}
                  onChange={(e) => handleChange("reviewSendTime", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reviewDelayDays">Délai avis (jours)</Label>
                <Input
                  id="reviewDelayDays"
                  type="number"
                  min={0}
                  max={7}
                  value={localSettings.reviewDelayDays}
                  onChange={(e) => handleChange("reviewDelayDays", parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminNotificationEmail">Email alertes admin</Label>
                <Input
                  id="adminNotificationEmail"
                  type="email"
                  value={localSettings.adminNotificationEmail}
                  onChange={(e) => handleChange("adminNotificationEmail", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Activer ou désactiver les emails automatiques</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-slate-700">Emails Client</h4>
                {[
                  { key: "emailConfirmation", label: "Confirmation réservation" },
                  { key: "emailReminder", label: "Rappel" },
                  { key: "emailReview", label: "Demande d'avis" },
                  { key: "emailCancellation", label: "Annulation" },
                  { key: "emailPending", label: "Pending (grand groupe)" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={key}>{label}</Label>
                    <Switch
                      id={key}
                      checked={localSettings.notifications?.[key] ?? false}
                      onCheckedChange={(checked) => handleNotificationChange(key, checked)}
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-slate-700">Alertes Admin</h4>
                {[
                  { key: "adminNewReservation", label: "Nouvelle réservation" },
                  { key: "adminModification", label: "Réservation modifiée" },
                  { key: "adminCancellation", label: "Annulation" },
                  { key: "adminNoShow", label: "No-show" },
                  { key: "adminRecidiviste", label: "Client récidiviste" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={key}>{label}</Label>
                    <Switch
                      id={key}
                      checked={localSettings.notifications?.[key] ?? false}
                      onCheckedChange={(checked) => handleNotificationChange(key, checked)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-slate-500">
          Dernière modification: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString("fr-BE") : "N/A"} par {settings.updatedBy ?? "N/A"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Restaurer valeurs par défaut
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </div>
      </div>
    </div>
  );
}
