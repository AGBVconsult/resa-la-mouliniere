# La Moulinière · proposition de refonte du site

Maquette interactive de la refonte de www.lamouliniere.be, construite autour du positionnement **60/40** :
**60 % accessible par le produit** (la moule, le prix unique, la clarté) et **40 % premium par la manière**
(la communication, le décor, le service).

**Ouvrir la maquette :** double-cliquer sur [`index.html`](./index.html). C'est un fichier autonome : polices, logo et
icônes sont intégrés. Les photos provisoires se chargent depuis Internet.

**Outil de présentation :** le bouton rond **60/40** (en bas à droite) affiche des annotations sur la page. Chacune
indique quel pilier du positionnement sert un choix de design. Le même panneau permet de basculer entre les thèmes
clair, sombre et automatique.

---

## 1. Le parti pris

> Lecture du brief : site vitrine d'un restaurant de moules sur le port d'Ostende, pour touristes, familles et
> habitués belges. Langage de brasserie de port généreuse, servie avec les manières d'une grande maison. Famille
> esthétique : éditorial chaleureux, une seule couleur d'accent, mouvement retenu.

La référence stratégique est le modèle des **Bouillons parisiens** : des prix démocratiques dans un décor et une
communication d'exception. Transposé à La Moulinière, cela donne ceci :

| Pilier | Ce que le site fait |
|---|---|
| **60 · le produit, accessible** | Prix unique affiché en très grand (29,90 €, Nature 27,90 €). Les 46 préparations et la Nature, filtrables par envie (ail, crème, relevé, sans crème…). Suppléments tous visibles, frites incluses dans l'affichage. Formules à deux, menu enfants, plats sans moules. Carte en 6 langues. Paiement annoncé avant de venir. |
| **40 · la manière, premium** | Typographie didone (Bodoni Moda), palette tirée de la moule, grain papier, animations lentes. Récit « Allisson reçoit, Benjamin cuisine ». Décor mis en scène (salle, terrasse face aux bateaux). Accord mets-vin suggéré pour chaque casserole. Rituels de service. |

La page raconte elle-même le 60/40 : elle commence **de jour** (le produit, la carte, la terrasse), puis
**le soir tombe sur le port** et le site bascule dans une ambiance nocturne (le service, les avis, la réservation).

## 2. Direction artistique

**Palette « Nacre & Encre »**, tirée de la moule elle-même :

| Rôle | Couleur | Origine |
|---|---|---|
| Fond jour | `#EFF0EB` nacre | l'intérieur de la coquille |
| Texte / nuit | `#111A22` encre | le bleu-noir de la coquille |
| Accent unique | `#D9643E` corail | la chair de la moule |
| Gris | famille bleutée `#46525D` → `#8D979F` | la mer du Nord |

Le corail sert à l'appétit et à l'action (prix, boutons, sélection), l'encre et la nacre à l'élégance.
Tous les textes respectent le contraste WCAG AA, en clair comme en sombre.

**Typographie en duo**, qui encode elle aussi le 60/40 :
- **Bodoni Moda** (didone, esprit des enseignes de brasseries Belle Époque) pour la voix de la maison : titres,
  citations, prix en grand. C'est le 40.
- **Karla** (grotesque chaleureuse, très lisible) pour le produit et l'information : carte, prix, infos pratiques.
  C'est le 60.

**Logo :** la coquille existante est conservée à l'identique, vectorisée depuis `public/logo-source`. Ses cernes de
croissance deviennent le motif graphique du site : anneaux autour de la photo d'accueil, fonds des photos
provisoires, marque dans le pied de page.

**Formes :** pilule pour tout ce qui se clique, 22 px pour les panneaux et photos, ovale réservé à l'image d'accueil
(l'ellipse de la coquille).

**Mouvement :** chaque animation a une raison d'être (hiérarchie, récit, retour d'action). Le texte du manifeste se
révèle au fil du défilement, la casserole se recompose avec un compteur de prix, le tiroir de réservation glisse.
Seuls `transform` et `opacity` sont animés, et `prefers-reduced-motion` coupe tout.

## 3. Parcours de la page

1. **Accueil** (grille 40/60) : « Quarante façons d'aimer la moule. » avec deux actions, réserver et découvrir la carte.
2. **Promesse** : le 60/40 dit avec les mots de la maison, signé Allisson & Benjamin.
3. **La carte** : « Moules 29,90 € » en grand, puis l'explorateur interactif (familles, envies, « Surprenez-moi ») et
   le panneau **Votre casserole** (suppléments, version légère, ajout d'ingrédients, total en direct, accord suggéré).
   La **carte complète** (boissons, desserts, vins) s'ouvre en plein écran et s'imprime.
4. **Pour tous les appétits** : formules à deux, menu de la mer, plats sans moules, enfants, tapas.
5. **La maison** : Allisson reçoit, Benjamin cuisine, depuis 2011.
6. **La terrasse** face aux bateaux (photo plein cadre).
7. **Le soir tombe** : transition du jour à la nuit.
8. **L'art de recevoir** : cinq engagements de service en cartes empilées.
9. **Avis** : extraits réels, trois lignes au plus.
10. **Infos pratiques** : adresse, horaires saisonniers, contact, paiement, accessibilité.
11. **Réservation** : tiroir en trois questions (combien, quel jour, quelle heure) puis passage au module existant
    `app.lamouliniere.be/widget` dans la bonne langue.

## 4. Ce que la refonte corrige, d'après vos avis Google

| Irritant relevé | Réponse dans le design |
|---|---|
| « Seul le paiement en espèces, et rien ne l'annonçait » | Paiement (Payconiq, application bancaire, espèces) affiché dans la réservation, les rituels de service et les infos pratiques. |
| Malentendu de langue avec un grand groupe | Site et carte en 6 langues. Les groupes de 5 personnes et plus sont confirmés personnellement par Allisson. Les groupes de 16 et plus passent par la demande de groupe. |
| « Prix des apéritifs un peu élevé » | Tous les prix sont visibles avant de venir, suppléments compris. |

## 5. Contenus utilisés

- **Carte et prix :** feuille « Menu Multilingue » (version du 25 août 2026), reprise telle quelle dans
  `src/menu.js` (6 langues). Seules corrections typographiques : « À l'Ostendaise », « Menu's », espaces avant « ? »
  en néerlandais.
- **Horaires :** les trois modes du « calendrier annuel 2025-2026 » (haute saison, saison standard, saison calme).
- **Avis :** extraits de la feuille « Avis La Moulinière » (Google) et titres d'avis Tripadvisor.
- **Histoire, adresse, téléphone, e-mails :** dépôt (`src/app/widget/layout.tsx`, `docs/Template_emails.md`) et
  sources publiques.
- **Textes du site :** rédigés pour la maquette dans les 6 langues (`src/i18n.js`).

## 6. À valider ou à fournir avant la mise en ligne

- [ ] **Photos :** celles de la maquette sont provisoires (Pexels, Wikimedia Commons). Chaque emplacement décrit la
      prise de vue attendue, ce qui sert de liste pour un shooting maison : casserole fumante, moules crues de
      Zélande, salle dressée, Benjamin en cuisine, verres de vin, port vu de la terrasse.
- [ ] **Horaires :** confirmer les libellés des saisons et les jours d'ouverture. Dans le tiroir de réservation, les
      jours ouverts sont un exemple basé sur la saison standard. Créneaux 12:00-13:00 et 18:00-19:00 d'après le
      seed du module.
- [ ] **Accords mets-vin :** suggestions éditoriales à valider avec Benjamin (`PAIRINGS` dans `src/menu.js`).
- [ ] **Avis cités :** accord des auteurs, ou remplacement par un flux d'avis vérifiés.
- [ ] **Formulations de service :** « à la minute », « cuisine ouverte sur la salle », chiens bienvenus (en salle ou
      en terrasse ?).
- [ ] **Pages légales :** mentions légales, confidentialité, cookies (boutons présents dans la maquette, contenu à
      rédiger).
- [ ] **Traductions :** relecture par des locuteurs natifs, surtout l'italien et l'espagnol.

## 7. Passage en production

- **Où :** ce dépôt est déjà en Next.js 16, Tailwind et Convex. Le site vitrine peut y vivre dans un groupe de routes
  `src/app/(site)/` partagé avec le module de réservation, avec les tokens de `src/styles.css` transposés dans
  `tailwind.config.js`.
- **Réservation :** ajouter au widget la lecture de paramètres de préremplissage (`?guests=&date=&service=&time=`
  dans `src/app/widget/components/Widget.tsx`, qui ne lit aujourd'hui que `lang` et `ref`). Brancher le tiroir sur
  les vraies disponibilités (Convex : `availability`, `specialPeriods`) au lieu du planning d'exemple.
- **Référencement :** le site actuel n'a pas pu être audité (domaine bloqué par le réseau de l'environnement de
  travail). Il faudra relever ses URL et redirections avant la bascule, et prévoir le `hreflang` des 6 langues et les
  données structurées `Restaurant` (déjà présentes dans la maquette).
- **Performance :** polices servies via `next/font`, photos via `next/image` (AVIF/WebP), la photo d'accueil en
  priorité de chargement.

## 8. Fichiers

```
design/refonte-site/
  index.html          maquette assemblée (à ouvrir)
  build.mjs           assemble src/ en un seul fichier : node design/refonte-site/build.mjs
  src/template.html   structure et textes français
  src/styles.css      tokens, composants, mouvement, thèmes clair/sombre/nuit
  src/menu.js         la carte réelle en 6 langues
  src/i18n.js         textes du site en 6 langues
  src/app.js          interactions (sans dépendance)
  src/assets/         logo vectorisé, polices (OFL), icônes Phosphor (MIT)
```

## 9. Méthode : skills utilisés

- **redesign-existing-projects** : ordre des chantiers (typographie, palette, états, mise en page) et audit des
  motifs génériques à éviter.
- **design-taste-frontend** : lecture du brief, réglages (variance 7, mouvement 6, densité 3), règles de hero,
  palette hors des clichés « premium », et contrôle final (aucun tiret cadratin, un seul accent, une seule intention
  par bouton, trois surtitres au plus).
- **high-end-visual-design** : cadres en double biseau, bouton avec icône imbriquée, courbes de mouvement, grain
  fixe.
- **ui-ux-pro-max** : recherche de système de design pour un restaurant (duo Playfair SC + Karla recommandé ; Karla
  retenu, Playfair remplacé par Bodoni Moda, jugé trop courant) et règles UX (contraste, cibles de 44 px, focus
  visibles, réduction du mouvement).

**Contrôles effectués** (navigateur headless) : 1024, 1280, 1440 et 1920 px, mobile 390 px, thèmes clair et sombre,
mouvement réduit, JavaScript désactivé. Aucune erreur JavaScript, pas de défilement horizontal, titre d'accueil sur
deux lignes dans les 6 langues à partir de 1024 px.

**Crédits :** Bodoni Moda et Karla (SIL Open Font License), icônes Phosphor (MIT). Photos provisoires : Pexels
(licence Pexels) et Wikimedia Commons (« Oostende Haven R01 », CC BY-SA).
