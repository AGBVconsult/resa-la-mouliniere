# Emails de Réservation — La Moulinière

## Récapitulatif des templates validés

---

## 1. Email "Demande en attente" (Grandes tables)

**Déclencheur :** Réservation de +4 personnes, validation manuelle requise.

| Élément | Contenu |
|---------|---------|
| **Objet** | Demande bien reçue (Validation en cours ⏳) |
| **Preheader** | Nous vérifions la disponibilité pour votre groupe. |

### Corps du message :

```
Bonjour {first_name},

Nous avons bien reçu votre demande pour une table de {guests} personnes.

Pour vous garantir un accueil soigné, et comme nous travaillons en duo, Allisson vérifie personnellement le planning avant de confirmer votre réservation.

📅 Détails de votre demande :
• Date : {date}
• Heure : {time}
• Personnes : {guests}

Vous recevrez un email de confirmation dès que possible.

Merci de votre patience,
Allisson & Benjamin
```

### Boutons/Liens :

- [Modifier ma demande]
- [Annuler]
- [Nous contacter]

---

## 2. Email "Réservation confirmée" (Séquence normale)

**Déclencheur :** Réservation confirmée (automatique ou après validation manuelle).

| Élément | Contenu |
|---------|---------|
| **Objet** | Réservation confirmée ! |
| **Preheader** | Votre table est réservée. |

### Corps du message :

```
Bonjour {first_name},

Votre table est réservée. Tout est prêt pour vous recevoir. Voici votre réservation :

📅 Votre récapitulatif :
• Date : {date}
• Heure : {time}
• Personnes : {guests}
• Adresse : {address}

💳 Bon à savoir pour le règlement :
Nous n'avons pas de terminal bancaire. Pour un règlement simple et rapide, nous utilisons Payconiq (comptes belges), vous pouvez aussi payer en espèces.

On se réjouit de vous accueillir,
Allisson & Benjamin
```

### Boutons/Liens :

- [Modifier ma réservation]
- [Annuler la réservation]
- [Nous contacter]

---

## 3. Email "Annulation après demande en attente" (Grandes tables)

**Déclencheur :** Refus d'une réservation suite à l'email "Demande en attente" (créneau complet, configuration salle).

| Élément | Contenu |
|---------|---------|
| **Objet** | Votre demande n'a pas pu être confirmée |
| **Preheader** | Nous revenons vers vous concernant votre réservation. |

### Corps du message :

```
Bonjour {first_name},

Comme convenu, Allisson a vérifié personnellement notre planning pour votre table de {guests} personnes.

Malheureusement, nous sommes complets à cet horaire et la configuration de la salle ne nous permet pas de vous installer confortablement.

📅 {date}
🕒 {time}
👤 {guests} personnes

Nous espérons sincèrement avoir le plaisir de vous accueillir une prochaine fois.

Bien à vous,
Allisson & Benjamin
```

### Boutons/Liens :

- [Voir les autres disponibilités]

---

## Variables disponibles

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{first_name}` | Prénom du client | Benjamin |
| `{guests}` | Nombre de convives | 6 personnes |
| `{date}` | Date de la réservation | Samedi 31 Janvier |
| `{time}` | Heure de la réservation | 12:30 |
| `{address}` | Adresse du restaurant | Visserskaai 14, 8400 Oostende |

---

## Séquences de réservation

### Séquence standard (≤4 personnes)

```
Réservation → Email "Réservation confirmée"
```

### Séquence grandes tables (+4 personnes) — Acceptée

```
Réservation → Email "Demande en attente" → Email "Réservation confirmée"
```

### Séquence grandes tables (+4 personnes) — Refusée

```
Réservation → Email "Demande en attente" → Email "Annulation après demande en attente"
```

---

## 4. Email "Annulation par le client"

**Déclencheur :** Le client annule lui-même sa réservation via le bouton dans l'email de confirmation.

| Élément | Contenu |
|---------|---------|
| **Objet** | Annulation confirmée |
| **Preheader** | Votre réservation a bien été annulée. |

### Corps du message :

```
Bonjour {first_name},

C'est bien noté : votre réservation est annulée.

📅 {date}
🕒 {time}
👤 {guests} personnes

Merci de nous avoir prévenus — c'est précieux pour notre organisation.

Au plaisir de vous accueillir une prochaine fois,
Allisson & Benjamin
```

### Boutons/Liens :

- [Réserver une autre date]

---

## 5. Email "Rappel H-3" (Quelques heures avant)

**Déclencheur :** Envoyé 3 heures avant la réservation pour rappeler au client et réduire les no-shows.

| Élément | Contenu |
|---------|---------|
| **Objet** | On vous attend tout à l'heure ! |
| **Preheader** | Votre table est prête. |

### Corps du message :

```
Bonjour {first_name},

On s'active en cuisine : votre table est prête pour ce soir !

📅 {date}
🕒 {time}
👤 {guests} personnes
📍 {address}

💳 Rappel pour le règlement :
Nous n'avons pas de terminal bancaire. Le paiement se fait via Payconiq (comptes belges) ou en espèces.

Un empêchement de dernière minute ? Pour nous éviter une table vide, un petit clic pour annuler nous aide beaucoup.

À très vite,
Allisson & Benjamin
```

### Boutons/Liens :

- [Annuler ma réservation]
- [Nous contacter]

---

## 6. Email "Modification de réservation"

**Déclencheur :** Le client modifie lui-même sa réservation (date, heure ou nombre de convives).

| Élément | Contenu |
|---------|---------|
| **Objet** | Réservation modifiée |
| **Preheader** | Votre réservation a bien été mise à jour. |

### Corps du message :

```
Bonjour {first_name},

Votre réservation a bien été modifiée. Voici votre nouveau récapitulatif :

📅 {date}
🕒 {time}
👤 {guests} personnes
📍 {address}

💳 Bon à savoir pour le règlement :
Nous n'avons pas de terminal bancaire. Pour un règlement simple et rapide, nous utilisons Payconiq (comptes belges), vous pouvez aussi payer en espèces.

À bientôt,
Allisson & Benjamin
```

### Boutons/Liens :

- [Modifier ma réservation]
- [Annuler]
- [Nous contacter]

---

## 7. Email "No-show" (Client non présenté)

**Déclencheur :** Le client n'est pas venu à sa réservation sans prévenir.

| Élément | Contenu |
|---------|---------|
| **Objet** | On vous a attendu(e) |
| **Preheader** | Votre table est restée vide. |

### Corps du message :

```
Bonjour {first_name},

Nous vous attendions pour votre réservation de {guests} personnes, mais vous ne vous êtes pas présenté(e).

📅 {date}
🕒 {time}

Les imprévus font partie de la vie, nous le comprenons.

Cependant, pour un duo comme le nôtre, chaque table compte. À l'avenir, un simple clic sur le lien « Annuler » de votre email de confirmation nous permet de libérer la place pour d'autres clients.

Bien à vous,
Allisson & Benjamin
```

---

## 8. Email "Demande d'avis J+1"

**Déclencheur :** Envoyé le lendemain de la visite pour solliciter un avis en ligne.

| Élément | Contenu |
|---------|---------|
| **Objet** | Merci pour votre visite ! |
| **Preheader** | Votre avis compte pour nous. |

### Corps du message :

```
Bonjour {first_name},

Merci encore d'être venu(e) à La Moulinière ! Nous espérons que vous avez passé un bon moment à notre table.

Si c'est le cas, un petit avis en ligne nous aide énormément. Chaque commentaire compte pour nous faire connaître.

Cela ne prend qu'une minute 👇

[Laisser un avis]

À très bientôt,
Allisson & Benjamin
```

### Note technique :

La redirection (Google ou TripAdvisor) est gérée par l'application en fonction du type d'email du client.

---

## 9. Email "Annulation par le restaurant" (Force Majeure)

**Déclencheur :** Le restaurant doit annuler une réservation pour cause de force majeure (problème technique ou santé).

| Élément | Contenu |
|---------|---------|
| **Objet** | Nous sommes sincèrement désolés... |
| **Preheader** | Nous devons malheureusement annuler votre réservation. |

### Corps du message :

```
Bonjour {first_name},

C'est le message que nous détestons écrire, mais nous ne pourrons malheureusement pas vous accueillir comme prévu.

Travaillant en duo, nous sommes contraints d'annuler votre réservation pour cause de force majeure (problème technique ou santé).

Votre réservation est annulée :

📅 {date}
🕒 {time}

Nous savons que cela perturbe vos plans et nous vous présentons nos plus plates excuses.

Bien à vous,
Allisson & Benjamin
```

---

## Notes

- **Ton :** 60% accessible, 40% premium
- **Signature :** Toujours signée "Allisson & Benjamin" pour humaniser
- **Moyens de paiement :** Rappelés systématiquement dans l'email de confirmation
- **Objectif :** Informer clairement pour éviter les frictions au moment du règlement
- **International friendly :** Éviter les expressions idiomatiques difficiles à traduire

---

*Document mis à jour le 28 janvier 2026 — La Moulinière, Oostende*