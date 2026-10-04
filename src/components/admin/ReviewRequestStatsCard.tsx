"use client";

import { useQuery } from "convex/react";
import { Star } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const monthFormatter = new Intl.DateTimeFormat("fr-BE", { month: "short", year: "numeric" });

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return monthFormatter.format(new Date(year, month - 1, 1));
}

export function ReviewRequestStatsCard() {
  const stats = useQuery(api.reviewRequests.getMonthlyStats, {});

  return (
    <Card style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
      <CardHeader style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
        <CardTitle style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Demandes d&apos;avis envoyées</CardTitle>
        <Star style={{ width: '1rem', height: '1rem', color: '#94a3b8' }} />
      </CardHeader>
      <CardContent style={{ padding: '0 1rem 1rem 1rem' }}>
        {stats === undefined ? (
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Chargement…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[...stats].reverse().map(({ monthKey, sent }) => (
              <div
                key={monthKey}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}
              >
                <span style={{ fontSize: '0.875rem', color: '#475569', textTransform: 'capitalize' }}>{formatMonth(monthKey)}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{sent}</span>
              </div>
            ))}
            <p style={{ fontSize: '0.75rem', color: '#64748b', paddingTop: '0.5rem' }}>
              Par mois du repas. Comptage depuis la mise en place du suivi.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
