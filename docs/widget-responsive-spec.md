# SPÉCIFICATION COMPLÈTE — Widget Responsive No-Scroll

**Mode :** Portrait uniquement | **Viewport minimum :** 667px (iPhone SE)

---

## 1. ARCHITECTURE DES HAUTEURS

### 1.1 Budget hauteur global (100dvh)

```
┌─────────────────────────────────────────┐
│           HEADER (8vh)                   │  ~53px sur 667px
├─────────────────────────────────────────┤
│                                         │
│                                         │
│           CONTENU (74vh)                │  ~494px sur 667px
│                                         │
│                                         │
├─────────────────────────────────────────┤
│           FOOTER (18vh)                  │  ~120px sur 667px
└─────────────────────────────────────────┘
```

### 1.2 Répartition en vh

| Zone    | % viewport | iPhone SE (667px) | iPhone 14 (852px) |
|---------|------------|-------------------|-------------------|
| Header  | 8vh        | 53px              | 68px              |
| Contenu | 74vh       | 494px             | 630px             |
| Footer  | 18vh       | 120px             | 153px             |
| **Total** | **100vh** | **667px**         | **852px**         |

---

## 2. COMPOSANTS GLOBAUX

### 2.1 Widget Container (Widget.tsx:219)

**Actuel :**
```tsx
className="w-full min-h-[100dvh] flex flex-col bg-white 
  md:min-h-0 md:max-w-[400px] md:h-[750px] ..."
```

**Proposé :**
```tsx
className="w-full h-[100dvh] flex flex-col bg-white 
  md:max-w-[400px] md:h-[100dvh] md:max-h-[850px] ..."
```

| Propriété | Valeur | Justification |
|-----------|--------|---------------|
| `h-[100dvh]` | 100% viewport | Remplace min-h pour contraindre |
| `md:max-h-[850px]` | Plafond desktop | Évite widget géant sur grands écrans |

### 2.2 BookingHeader (BookingHeader.tsx)

**Actuel :**
```tsx
<div className="bg-slate-900 text-white px-4 py-3">
  <div className="flex items-center justify-between h-12">
```

**Proposé :**
```tsx
<div className="bg-slate-900 text-white px-4 py-[1.5vh] min-h-[8vh]">
  <div className="flex items-center justify-between h-[4vh] min-h-[40px]">
```

| Élément | Actuel | Proposé | Justification |
|---------|--------|---------|---------------|
| Container padding | `py-3` (12px) | `py-[1.5vh]` | Adaptatif |
| Container height | implicite | `min-h-[8vh]` | Budget garanti |
| Row height | `h-12` (48px) | `h-[4vh] min-h-[40px]` | Adaptatif + minimum |
| Summary margin | `mt-2` (8px) | `mt-[0.5vh]` | Adaptatif |
| Icons | `size={16}`, `size={14}` | `size={14}` unifié | Cohérence |

### 2.3 BookingFooter + NavigationFooter

**BookingFooter.tsx:13 — Actuel :**
```tsx
<div className="px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] ...">
```

**Proposé :**
```tsx
<div className="px-[4vw] pt-[1vh] pb-[calc(1vh+env(safe-area-inset-bottom))] ...">
```

**NavigationFooter.tsx:38 — Actuel :**
```tsx
<div className="px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] ... flex items-center gap-3">
  <button className="... py-4 ...">
```

**Proposé :**
```tsx
<div className="px-[4vw] pt-[1.5vh] pb-[calc(2vh+env(safe-area-inset-bottom))] ... flex items-center gap-[2vw]">
  <button className="... py-[1.5vh] min-h-[44px] ...">
```

| Élément | Actuel | Proposé | Justification |
|---------|--------|---------|---------------|
| Padding horizontal | `px-6` (24px) | `px-[4vw]` | Adaptatif largeur |
| Padding top | `pt-4` (16px) | `pt-[1.5vh]` | Adaptatif hauteur |
| Button padding | `py-4` (16px) | `py-[1.5vh] min-h-[44px]` | Touch target garanti |
| Gap | `gap-3` (12px) | `gap-[2vw]` | Adaptatif |
| Footer total | ~18vh | 18vh | Budget respecté |

---

## 3. STEP 1 — Guests (Step1Guests.tsx)

### 3.1 Structure actuelle

```
Step1Guests
├── StepHeader (mb-6 = 24px)
├── Card Compteurs (p-4, mb-4)
│   ├── CounterRow Adultes (py-3, h-11 buttons)
│   ├── Divider
│   ├── CounterRow Enfants (py-3, h-11 buttons)
│   ├── Divider
│   └── CounterRow Bébés (py-3, h-11 buttons)
└── Toggles (space-y-2)
    ├── Toggle Poussette (conditionnel)
    ├── Toggle Chaise haute (conditionnel)
    ├── Toggle PMR
    └── Toggle Chien
```

### 3.2 Spécification responsive

| Composant | Actuel | Proposé |
|-----------|--------|---------|
| Container | `px-6 py-4` | `px-[4vw] py-[2vh]` |
| StepHeader margin | `mb-6` | `mb-[2vh]` |
| Card padding | `p-4` | `p-[2vh]` |
| Card margin | `mb-4` | `mb-[2vh]` |
| CounterRow padding | `py-3` | `py-[1.5vh] min-h-[6vh]` |
| Counter buttons | `w-11 h-11` | `w-[6vh] h-[6vh] min-w-[40px] min-h-[40px]` |
| Counter value | `w-8 text-lg` | `w-[4vh] text-[2.5vh]` |
| Toggles gap | `space-y-2` | `space-y-[1vh]` |
| Toggle height | `min-h-[44px] p-3` | `min-h-[6vh] p-[1.5vh]` |

### 3.3 Calcul hauteur Step1

| Élément | Hauteur vh | Min px |
|---------|------------|--------|
| StepHeader | 6vh | 40px |
| Margin | 2vh | 13px |
| Card (3 rows) | 24vh | 160px |
| Margin | 2vh | 13px |
| 4 Toggles | 28vh | 186px |
| Padding | 4vh | 27px |
| **Total** | **66vh** | **439px** |

✅ **Tient dans 74vh disponibles**

---

## 4. STEP 2 — DateTime (Step2DateTime.tsx)

### 4.1 Structure

```
Step2DateTime
├── StepHeader (px-6 pt-6 pb-4)
├── MonthCalendar OU MiniCalendarStrip + bouton
└── TimeSlotGrid (conditionnel, overflow-y-auto)
```

### 4.2 MonthCalendar — Spécification

| Composant | Actuel | Proposé |
|-----------|--------|---------|
| Container | `p-6` | `p-[2vh]` |
| Nav row margin | `mb-6` | `mb-[1.5vh]` |
| Nav buttons | `w-11 h-11` | `w-[5vh] h-[5vh] min-w-[36px] min-h-[36px]` |
| Month title | `text-lg` | `text-[2.2vh]` |
| Days header | `mb-2` | `mb-[0.5vh]` |
| Days label | `text-[10px]` | `text-[1.3vh]` |
| Grid gap | `gap-1` | `gap-[0.5vh]` |
| Cell height | `aspect-square` | `h-[5.5vh] min-h-[36px]` |
| Cell number | `text-sm` | `text-[1.8vh]` |
| Indicators | `w-2 h-2` | `w-[1vh] h-[1vh] min-w-[6px] min-h-[6px]` |
| Legend margin | `mt-6 pt-4` | `mt-[1.5vh] pt-[1vh]` |
| Legend text | `text-xs` | `text-[1.4vh]` |

### 4.3 Calcul hauteur MonthCalendar

| Élément | Hauteur vh | Min px |
|---------|------------|--------|
| Padding top | 2vh | 13px |
| Navigation | 5vh | 33px |
| Margin | 1.5vh | 10px |
| Days header | 2vh | 13px |
| Grid 6 lignes | 33vh + 2.5vh gaps | 237px |
| Legend | 4vh | 27px |
| Padding bottom | 2vh | 13px |
| **Total** | **~50vh** | **~346px** |

✅ **Tient dans 74vh - StepHeader (6vh) = 68vh disponibles**

### 4.4 MiniCalendarStrip — Spécification

| Composant | Actuel | Proposé |
|-----------|--------|---------|
| Container | `py-4` | `py-[1.5vh]` |
| Button width | `w-14` | `w-[12vw] min-w-[48px]` |
| Button padding | `py-2` | `py-[1vh]` |
| Day label | `text-[10px]` | `text-[1.2vh]` |
| Day number | `text-xl` | `text-[2.8vh]` |
| Indicators | `w-1.5 h-1.5` | `w-[0.8vh] h-[0.8vh]` |

### 4.5 TimeSlotGrid — Spécification

| Composant | Actuel | Proposé |
|-----------|--------|---------|
| Grid | `grid-cols-3 sm:grid-cols-4 gap-2` | `grid-cols-3 gap-[1vh]` |
| Button | `py-3 min-h-[44px]` | `py-[1.2vh] min-h-[5vh]` |
| Button text | `text-sm` | `text-[1.6vh]` |

---

## 5. STEP 3 — Contact (Step3Contact.tsx)

### 5.1 Structure

```
Step3Contact
├── StepHeader (mb-6)
└── Card Form (p-4)
    ├── Prénom + Nom (grid-cols-2 gap-4)
    ├── Email (mb-4)
    ├── Téléphone (mb-4)
    └── Message (textarea rows=3)
```

### 5.2 Problème actuel

- `overflow-y-auto` sur le container → scroll activé
- Hauteur du formulaire dépasse potentiellement l'espace

### 5.3 Spécification responsive

| Composant | Actuel | Proposé |
|-----------|--------|---------|
| Container | `p-6` | `p-[2vh]` |
| StepHeader margin | `mb-6` | `mb-[2vh]` |
| Card padding | `p-4` | `p-[2vh]` |
| Grid gap | `gap-4` | `gap-[2vw]` |
| Input margin | `mb-4` | `mb-[1.5vh]` |
| Input label | `text-xs mb-1.5` | `text-[1.4vh] mb-[0.5vh]` |
| Input padding | `px-4 py-3` | `px-[3vw] py-[1.2vh]` |
| Input height | implicite | `min-h-[5vh]` |
| Textarea rows | `rows={3}` | `rows={2}` + `min-h-[8vh]` |
| overflow | `overflow-y-auto` | `overflow-hidden` |

### 5.4 Calcul hauteur Step3

| Élément | Hauteur vh | Min px |
|---------|------------|--------|
| Padding | 2vh | 13px |
| StepHeader | 6vh | 40px |
| Margin | 2vh | 13px |
| Card padding | 2vh | 13px |
| Nom/Prénom row | 8vh | 53px |
| Email | 8vh | 53px |
| Téléphone | 8vh | 53px |
| Message | 12vh | 80px |
| Card padding | 2vh | 13px |
| Padding | 2vh | 13px |
| **Total** | **~52vh** | **~344px** |

✅ **Tient dans 74vh disponibles**

---

## 6. STEP 4 — PracticalInfo (Step5PracticalInfo.tsx)

### 6.1 Structure

```
Step5PracticalInfo
├── StepHeader (mb-4)
└── Card (flex-1, justify-between)
    ├── 3× Info blocks (space-y-3)
    │   ├── Icon (w-8 h-8)
    │   └── Text
    └── Signature (pt-4 mt-3 border-t)
```

### 6.2 Spécification responsive

| Composant | Actuel | Proposé |
|-----------|--------|---------|
| Container | `p-6` | `p-[2vh]` |
| StepHeader margin | `mb-4` | `mb-[1.5vh]` |
| Card padding | `p-4` | `p-[2vh]` |
| Info blocks gap | `space-y-3` | `space-y-[1.5vh]` |
| Icon container | `w-8 h-8` | `w-[4vh] h-[4vh] min-w-[28px] min-h-[28px]` |
| Icon size | `size={14}` | `size={14}` (fixe) |
| Text | `text-sm` | `text-[1.6vh]` |
| Signature padding | `pt-4 mt-3` | `pt-[1.5vh] mt-[1.5vh]` |
| Signature text | `text-sm`, `text-xs` | `text-[1.6vh]`, `text-[1.3vh]` |

### 6.3 Calcul hauteur Step4

| Élément | Hauteur vh |
|---------|------------|
| Padding | 2vh |
| StepHeader | 6vh |
| Margin | 1.5vh |
| Card padding | 2vh |
| 3× Info blocks | 30vh |
| Signature | 6vh |
| Card padding | 2vh |
| Padding | 2vh |
| **Total** | **~51.5vh** |

✅ **Tient dans 74vh disponibles**

---

## 7. STEP 5 — Policy/Summary (Step4Policy.tsx)

### 7.1 Problème critique : Turnstile

Le widget Turnstile de Cloudflare a une hauteur de **~65px** (compact) à **~300px** (normal).

### 7.2 Solution : Mode compact + layout optimisé

```tsx
<Turnstile
  siteKey={settings.turnstileSiteKey}
  options={{ size: "compact" }}  // ← AJOUTER
  ...
/>
```

### 7.3 Spécification responsive

| Composant | Actuel | Proposé |
|-----------|--------|---------|
| Container | `p-6` | `p-[2vh]` |
| StepHeader margin | `mb-6` | `mb-[1.5vh]` |
| Cards margin | `mb-4` | `mb-[1.5vh]` |
| Card padding | `p-4` | `p-[1.5vh]` |
| Card title | `mb-3` | `mb-[1vh]` |
| Rows gap | `space-y-2` | `space-y-[0.8vh]` |
| Icons | `size={16}` | `size={14}` |
| Text | `text-sm` | `text-[1.5vh]` |
| Turnstile margin | `mb-4` | `mb-[1.5vh]` |
| overflow | `overflow-y-auto` | `overflow-hidden` |

### 7.4 Calcul hauteur Step5 (optimisé)

| Élément | Hauteur vh |
|---------|------------|
| Padding | 2vh |
| StepHeader | 5vh |
| Margin | 1.5vh |
| Card Récap | 14vh |
| Margin | 1.5vh |
| Card Client | 10vh |
| Margin | 1.5vh |
| Turnstile (compact) | 10vh |
| Error (optionnel) | 4vh |
| Padding | 2vh |
| **Total** | **~52vh** |

✅ **Tient dans 74vh disponibles**

---

## 8. STEP 6 — Confirmation (Step6Confirmation.tsx)

### 8.1 Problème actuel

- Trop de contenu : icône + titre + 2-3 cards + email + boutons
- `overflow-y-auto` activé

### 8.2 Solution : Design condensé

| Composant | Actuel | Proposé |
|-----------|--------|---------|
| Icon container | `w-20 h-20 mb-6` | `w-[10vh] h-[10vh] mb-[2vh]` |
| Icon | `size={40}` | `size={32}` |
| Title | `text-2xl mb-2` | `text-[2.8vh] mb-[0.5vh]` |
| Subtitle | `mb-8` | `mb-[2vh]` |
| Cards max-width | `max-w-sm` | `max-w-[90%]` |
| Card padding | `p-4` | `p-[1.5vh]` |
| Card margin | `mb-4` | `mb-[1.5vh]` |
| Card title | `mb-3` | `mb-[0.8vh]` |
| Rows gap | `space-y-2` | `space-y-[0.6vh]` |
| Email text | `mb-4` | `mb-[1.5vh]` |
| Action buttons | `py-3` | `py-[1.2vh] min-h-[44px]` |
| overflow | `overflow-y-auto` | `overflow-hidden` |

### 8.3 Simplification proposée

**Fusionner les cards :** Une seule card avec récap + infos client au lieu de 2 cards séparées.

### 8.4 Calcul hauteur Step6 (optimisé)

| Élément | Hauteur vh |
|---------|------------|
| Padding | 2vh |
| Icon | 10vh |
| Margin | 2vh |
| Title + Subtitle | 6vh |
| Margin | 2vh |
| Card fusionnée | 22vh |
| Email text | 3vh |
| Margin | 1.5vh |
| Action buttons | 6vh |
| Padding | 2vh |
| **Total** | **~56.5vh** |

✅ **Tient dans 74vh disponibles (marge de 17.5vh)**

---

## 9. COMPOSANTS UI PARTAGÉS

### 9.1 StepHeader (StepHeader.tsx)

| Élément | Actuel | Proposé |
|---------|--------|---------|
| Title | `text-xl` | `text-[2.5vh]` |
| Subtitle | `text-sm` | `text-[1.6vh]` |
| Gap | `mb-1` | `mb-[0.3vh]` |

### 9.2 CounterRow (CounterRow.tsx)

| Élément | Actuel | Proposé |
|---------|--------|---------|
| Container | `py-3` | `py-[1.2vh]` |
| Label | `text-sm` | `text-[1.6vh]` |
| Sublabel | `text-xs` | `text-[1.3vh]` |
| Buttons | `w-11 h-11` | `w-[5.5vh] h-[5.5vh] min-w-[40px] min-h-[40px]` |
| Value | `w-8 text-lg` | `w-[4vh] text-[2.2vh]` |
| Icons | `size={20}` | `size={16}` |

### 9.3 Toggle (Toggle.tsx)

| Élément | Actuel | Proposé |
|---------|--------|---------|
| Container | `p-3 min-h-[44px]` | `p-[1.2vh] min-h-[5.5vh]` |
| Icon | `size={20}` | `size={18}` |
| Label | `text-sm` | `text-[1.6vh]` |
| Checkbox | `w-6 h-6` | `w-[3vh] h-[3vh] min-w-[20px] min-h-[20px]` |
| Check icon | `size={14}` | `size={12}` |

### 9.4 Input (Input.tsx)

| Élément | Actuel | Proposé |
|---------|--------|---------|
| Margin | `mb-4` | `mb-[1.5vh]` |
| Label | `text-xs mb-1.5` | `text-[1.4vh] mb-[0.5vh]` |
| Input | `px-4 py-3` | `px-[3vw] py-[1.2vh] min-h-[5vh]` |
| Error | `mt-1 text-xs` | `mt-[0.3vh] text-[1.3vh]` |

### 9.5 ProgressIndicator (ProgressIndicator.tsx)

| Élément | Actuel | Proposé |
|---------|--------|---------|
| Step dot | `w-5 h-5` | `w-[2.5vh] h-[2.5vh] min-w-[16px] min-h-[16px]` |
| Inner dot | `w-2 h-2` | `w-[1vh] h-[1vh]` |
| Connector | `w-3 h-[2px]` | `w-[1.5vh] h-[0.3vh]` |
| Check icon | `size={12}` | `size={10}` |

---

## 10. RÉCAPITULATIF DES MODIFICATIONS

### 10.1 Fichiers à modifier

| Fichier | Priorité | Complexité |
|---------|----------|------------|
| Widget.tsx | 🔴 Haute | Faible |
| BookingHeader.tsx | 🔴 Haute | Faible |
| BookingFooter.tsx | 🔴 Haute | Faible |
| NavigationFooter.tsx | 🔴 Haute | Faible |
| MonthCalendar.tsx | 🔴 Haute | Moyenne |
| MiniCalendarStrip.tsx | 🟠 Moyenne | Faible |
| Step1Guests.tsx | 🟠 Moyenne | Faible |
| Step2DateTime.tsx | 🟠 Moyenne | Faible |
| Step3Contact.tsx | 🟠 Moyenne | Faible |
| Step4Policy.tsx | 🔴 Haute | Moyenne |
| Step5PracticalInfo.tsx | 🟢 Basse | Faible |
| Step6Confirmation.tsx | 🔴 Haute | Moyenne |
| CounterRow.tsx | 🟠 Moyenne | Faible |
| Toggle.tsx | 🟠 Moyenne | Faible |
| Input.tsx | 🟠 Moyenne | Faible |
| TimeSlotGrid.tsx | 🟠 Moyenne | Faible |
| StepHeader.tsx | 🟢 Basse | Très faible |
| ProgressIndicator.tsx | 🟢 Basse | Faible |

### 10.2 Changements critiques

1. ❌ **Supprimer** tous les `overflow-y-auto` sur les containers de steps
2. ✏️ **Modifier** le container principal de `min-h-[100dvh]` à `h-[100dvh]`
3. ➕ **Ajouter** `size: "compact"` sur Turnstile
4. 🔀 **Fusionner** les cards dans Step6Confirmation
5. 🔄 **Convertir** toutes les valeurs fixes en unités vh/vw

---

## 11. VARIABLES CSS GLOBALES (OPTIONNEL)

Pour faciliter la maintenance, créer des variables CSS :

```css
:root {
  /* Espacements */
  --space-xs: 0.5vh;
  --space-sm: 1vh;
  --space-md: 2vh;
  --space-lg: 3vh;
  
  /* Typographie */
  --text-xs: 1.3vh;
  --text-sm: 1.6vh;
  --text-base: 1.8vh;
  --text-lg: 2.2vh;
  --text-xl: 2.5vh;
  --text-2xl: 2.8vh;
  
  /* Touch targets */
  --touch-min: max(44px, 5.5vh);
  --touch-sm: max(36px, 4.5vh);
  
  /* Layout */
  --header-h: 8vh;
  --footer-h: 18vh;
  --content-h: 74vh;
}
```

---

## ✅ Update Todos

- [x] Analyser Step1Guests - dimensionnement responsive
- [x] Analyser Step2DateTime - dimensionnement responsive
- [x] Analyser Step3Contact - dimensionnement responsive
- [x] Analyser Step4/Step5 (PracticalInfo + Policy) - dimensionnement responsive
- [x] Analyser Step6Confirmation - dimensionnement responsive
- [x] Analyser composants UI partagés (Header, Footer, Navigation)
- [x] Produire spécification complète avec valeurs vh pour chaque élément

---

## 🧙 RÉSUMÉ EXÉCUTIF

### Principe directeur

| Zone | Budget | Unité |
|------|--------|-------|
| Header | 8vh | `min-h-[8vh]` |
| Contenu | 74vh | `h-[74vh]` |
| Footer | 18vh | `min-h-[18vh]` |

### Conversions clés

| Type | Pixels fixes → | Unités vh/vw |
|------|----------------|--------------|
| Petit espace | 8-12px | 1vh |
| Moyen espace | 16-24px | 2vh |
| Bouton touch | 44px | 5.5vh min-h-[44px] |
| Texte petit | 12px | 1.4vh |
| Texte normal | 14px | 1.6vh |
| Texte grand | 20px | 2.5vh |
| Padding horizontal | 24px | 4vw |

### Actions critiques

| Action | Détail |
|--------|--------|
| ❌ **Supprimer** | `overflow-y-auto` sur Steps 3, 4, 5, 6 |
| ✏️ **Modifier** | `min-h-[100dvh]` → `h-[100dvh]` |
| ➕ **Ajouter** | `size: "compact"` sur Turnstile |
| 🔀 **Fusionner** | Cards dans Step6Confirmation |
| 🔄 **Convertir** | Toutes les valeurs px → vh/vw |
