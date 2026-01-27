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

## 2. Email "Réservation confirmée"

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

## Variables disponibles

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{first_name}` | Prénom du client | Benjamin |
| `{guests}` | Nombre de convives | 6 personnes |
| `{date}` | Date de la réservation | Samedi 31 Janvier |
| `{time}` | Heure de la réservation | 12:30 |
| `{address}` | Adresse du restaurant | Visserskaai 17, 8400 Oostende |

---

## Séquences de réservation

### Séquence standard (≤4 personnes)

```
Réservation → Email "Réservation confirmée"
```

### Séquence grandes tables (+4 personnes)

```
Réservation → Email "Demande en attente" → Email "Réservation confirmée"
```

---

## Notes

- **Ton :** 60% accessible, 40% premium
- **Signature :** Toujours signée "Allisson & Benjamin" pour humaniser
- **Moyens de paiement :** Rappelés systématiquement dans l'email de confirmation
- **Objectif :** Informer clairement pour éviter les frictions au moment du règlement

---

*Document généré le 27 janvier 2026 — La Moulinière, Oostende*