"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  // Fetch today's reservations for both services
  const lunchReservations = useQuery(api.admin.listReservations, {
    dateKey: today,
    service: "lunch",
    paginationOpts: { numItems: 100, cursor: null },
  });

  const dinnerReservations = useQuery(api.admin.listReservations, {
    dateKey: today,
    service: "dinner",
    paginationOpts: { numItems: 100, cursor: null },
  });

  // Calculate stats
  const lunchData = lunchReservations?.page ?? [];
  const dinnerData = dinnerReservations?.page ?? [];
  const allToday = [...lunchData, ...dinnerData];

  const pendingCount = allToday.filter((r) => r.status === "pending").length;
  const confirmedCount = allToday.filter((r) => r.status === "confirmed").length;
  const seatedCount = allToday.filter((r) => r.status === "seated").length;
  const totalGuests = allToday
    .filter((r) => ["pending", "confirmed", "seated"].includes(r.status))
    .reduce((sum, r) => sum + r.partySize, 0);

  const isLoading = lunchReservations === undefined || dinnerReservations === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Link href="/admin/service">
          <Button size="lg" className="min-h-[44px]">
            <CalendarDays className="mr-2 h-5 w-5" />
            Vue Service
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Pending */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "-" : pendingCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Reservations a valider
            </p>
          </CardContent>
        </Card>

        {/* Confirmed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmees</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "-" : confirmedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Prets a accueillir
            </p>
          </CardContent>
        </Card>

        {/* Seated */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En salle</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "-" : seatedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Actuellement installes
            </p>
          </CardContent>
        </Card>

        {/* Total Guests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Couverts</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "-" : totalGuests}
            </div>
            <p className="text-xs text-muted-foreground">
              Total aujourd hui
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Lunch Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Dejeuner
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Chargement...</p>
            ) : lunchData.length === 0 ? (
              <p className="text-muted-foreground">Aucune reservation</p>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reservations</span>
                  <span className="font-medium">{lunchData.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Couverts</span>
                  <span className="font-medium">
                    {lunchData
                      .filter((r) =>
                        ["pending", "confirmed", "seated"].includes(r.status)
                      )
                      .reduce((sum, r) => sum + r.partySize, 0)}
                  </span>
                </div>
                <Link href="/admin/service?service=lunch">
                  <Button variant="outline" className="mt-2 w-full min-h-[44px]">
                    Voir le service
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dinner Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Diner
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Chargement...</p>
            ) : dinnerData.length === 0 ? (
              <p className="text-muted-foreground">Aucune reservation</p>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reservations</span>
                  <span className="font-medium">{dinnerData.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Couverts</span>
                  <span className="font-medium">
                    {dinnerData
                      .filter((r) =>
                        ["pending", "confirmed", "seated"].includes(r.status)
                      )
                      .reduce((sum, r) => sum + r.partySize, 0)}
                  </span>
                </div>
                <Link href="/admin/service?service=dinner">
                  <Button variant="outline" className="mt-2 w-full min-h-[44px]">
                    Voir le service
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending reservations alert */}
      {pendingCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
            <div className="flex-1">
              <p className="font-medium">
                {pendingCount} reservation{pendingCount > 1 ? "s" : ""} en
                attente de validation
              </p>
              <p className="text-sm text-muted-foreground">
                Ces reservations necessitent votre attention
              </p>
            </div>
            <Link href="/admin/service?status=pending">
              <Button className="min-h-[44px]">Voir</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
