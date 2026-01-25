# Epic 2 — Emails & Notifications

**Priorité :** Moyenne
**Statut :** 🔄 En cours
**Créé le :** 2026-01-25

---

## Description

Amélioration et correction du système d'envoi d'emails automatiques lors des changements de statut des réservations.

## Objectifs

1. Corriger l'envoi d'emails lors des changements de statut admin
2. Ajouter l'envoi d'email pour le statut No-show
3. Garantir la fiabilité du système d'emails

---

## 🐛 Bugs à corriger

### Bug 2.1 — Emails non envoyés lors du changement de statut admin

**Priorité :** P1 — Haute
**Statut :** 🔴 À corriger
**Découvert le :** 2026-01-25

#### Description
Lorsque l'admin confirme ou annule une réservation en attente via l'interface admin, l'email correspondant n'est pas envoyé au client.

#### Comportement attendu
- `pending` → `confirmed` : envoie `reservation.validated`
- `*` → `cancelled` : envoie `reservation.cancelled`
- `*` → `refused` : envoie `reservation.refused`

#### Comportement actuel
Les emails ne sont pas envoyés (à investiguer).

#### Code concerné
- `convex/admin.ts` : fonction `updateReservation` (lignes ~746-810)
- Code ajouté le 2026-01-25 (commit 5088013)

#### Investigation à faire
- [ ] Vérifier les logs Convex pour voir si `emails.enqueue` est appelé
- [ ] Vérifier si le dedupeKey bloque l'envoi
- [ ] Vérifier que les templates `reservation.validated`, `reservation.cancelled`, `reservation.refused` fonctionnent
- [ ] Tester manuellement avec un changement de statut

---

## 💡 Features à implémenter

### Feature 2.2 — Email No-show au client

**Priorité :** P2 — Moyenne
**Statut :** 💭 Idée / À brainstormer
**Proposé le :** 2026-01-25

#### Description
Envoyer un email au client lorsque sa réservation est marquée comme "No-show" (non présenté).

#### Questions à résoudre (brainstorm)

**1. Objectif de l'email ?**
- [ ] Informatif : "Vous ne vous êtes pas présenté"
- [ ] Pédagogique : "Les no-shows impactent le restaurant..."
- [ ] Récupération : "Voulez-vous reprogrammer ?"
- [ ] Avertissement : "Votre compte a été noté"

**2. Timing de l'envoi ?**
- [ ] Immédiat (dès que le statut passe à no-show)
- [ ] Différé (le lendemain matin, moins agressif)
- [ ] Via le cron `dailyFinalize` (automatique à 3h du matin)

**3. Contenu suggéré ?**
```
Objet : Votre réservation du {date} - Non présenté

Bonjour {firstName},

Nous avons constaté que vous ne vous êtes pas présenté(e)
à votre réservation du {date} à {time} pour {partySize} personnes.

Si vous avez rencontré un empêchement, nous comprenons.
À l'avenir, merci d'annuler votre réservation à l'avance
pour permettre à d'autres clients d'en profiter.

Nous espérons vous revoir bientôt !
L'équipe de La Moulinière
```

**4. Faut-il un template multilingue ?**
- [ ] Oui (FR, NL, EN, DE, IT comme les autres emails)

**5. Faut-il une option pour désactiver cet email ?**
- [ ] Non, toujours envoyer
- [ ] Oui, configurable dans settings

**6. Cas particuliers à gérer ?**
- [ ] No-show automatique (via cron) vs manuel (admin clique)
- [ ] Client blacklisté (ne pas envoyer ?)
- [ ] Client récidiviste (message différent ?)

#### Implémentation technique (esquisse)

1. **Nouveau type d'email** : `reservation.noshow`
2. **Template** : `convex/lib/email/templates.ts`
3. **Déclencheur** :
   - Dans `admin.ts:updateReservation` quand status → "noshow"
   - Ou dans `jobs.ts:dailyFinalize` pour les no-shows automatiques

#### Dépendances
- Bug 2.1 doit être corrigé d'abord (même pattern d'envoi)

---

## Stories futures (après brainstorm)

| ID | Nom | Priorité | Effort estimé | Statut |
|----|-----|----------|---------------|--------|
| 2.1 | Fix emails changement statut admin | P1 | 1h | 🔴 À faire |
| 2.2 | Email No-show | P2 | 2h | 💭 À définir |
| 2.3 | Tests E2E emails | P3 | 2h | 💭 À définir |

---

## Notes

- Le système d'email utilise Resend avec une queue (`emailJobs`)
- Les crons traitent la queue toutes les minutes
- Emails existants : confirmed, pending, validated, refused, cancelled, reminder, review

---

*Epic créé le 2026-01-25*
