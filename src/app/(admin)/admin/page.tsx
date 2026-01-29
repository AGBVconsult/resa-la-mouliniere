import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Users, Clock, TrendingUp } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Tableau de bord</h1>
        <p style={{ color: '#475569' }}>Vue d'ensemble des réservations</p>
      </div>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <Card style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: 0 }}>
          <CardHeader style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', padding: '1rem' }}>
            <CardTitle style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>
              Réservations aujourd'hui
            </CardTitle>
            <CalendarDays style={{ width: '1rem', height: '1rem', color: '#94a3b8' }} />
          </CardHeader>
          <CardContent style={{ padding: '0 1rem 1rem 1rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>12</div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>48 couverts</p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: 0 }}>
          <CardHeader style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', padding: '1rem' }}>
            <CardTitle style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>
              Cette semaine
            </CardTitle>
            <TrendingUp style={{ width: '1rem', height: '1rem', color: '#94a3b8' }} />
          </CardHeader>
          <CardContent style={{ padding: '0 1rem 1rem 1rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>67</div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>+12% vs semaine dernière</p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: 0 }}>
          <CardHeader style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', padding: '1rem' }}>
            <CardTitle style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>
              En attente
            </CardTitle>
            <Clock style={{ width: '1rem', height: '1rem', color: '#94a3b8' }} />
          </CardHeader>
          <CardContent style={{ padding: '0 1rem 1rem 1rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>3</div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>À confirmer</p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: 0 }}>
          <CardHeader style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', padding: '1rem' }}>
            <CardTitle style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>
              Couverts ce mois
            </CardTitle>
            <Users style={{ width: '1rem', height: '1rem', color: '#94a3b8' }} />
          </CardHeader>
          <CardContent style={{ padding: '0 1rem 1rem 1rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>284</div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Sur 89 réservations</p>
          </CardContent>
        </Card>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <Card style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          <CardHeader style={{ padding: '1rem' }}>
            <CardTitle style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Prochaines réservations</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: '0 1rem 1rem 1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <p style={{ fontWeight: 500, color: '#0f172a' }}>Martin Dupont</p>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>4 personnes • 12:30</p>
                </div>
                <span style={{ paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500, backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '9999px' }}>
                  Confirmé
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <p style={{ fontWeight: 500, color: '#0f172a' }}>Sophie Bernard</p>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>2 personnes • 13:00</p>
                </div>
                <span style={{ paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500, backgroundColor: '#fef9c3', color: '#a16207', borderRadius: '9999px' }}>
                  En attente
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
                <div>
                  <p style={{ fontWeight: 500, color: '#0f172a' }}>Jean Lefebvre</p>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>6 personnes • 19:30</p>
                </div>
                <span style={{ paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500, backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '9999px' }}>
                  Confirmé
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          <CardHeader style={{ padding: '1rem' }}>
            <CardTitle style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Activité récente</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: '0 1rem 1rem 1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ width: '0.5rem', height: '0.5rem', marginTop: '0.5rem', borderRadius: '9999px', backgroundColor: '#22c55e' }} />
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#0f172a' }}>Nouvelle réservation confirmée</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Il y a 5 minutes</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ width: '0.5rem', height: '0.5rem', marginTop: '0.5rem', borderRadius: '9999px', backgroundColor: '#3b82f6' }} />
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#0f172a' }}>Réservation modifiée - Martin D.</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Il y a 1 heure</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ width: '0.5rem', height: '0.5rem', marginTop: '0.5rem', borderRadius: '9999px', backgroundColor: '#ef4444' }} />
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#0f172a' }}>Annulation - Pierre M.</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Il y a 2 heures</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
