# Audit ciblé — Interface tablette (`/admin-tablette`)

**Date** : 2026-09-04 · **Commit** : `9b8edc5` (`main`) · **Complément de** : `AUDIT_TECHNIQUE_COMPLET_2026-09-03.md`

**Périmètre lu intégralement** : `src/app/admin-tablette/**` (page de 1 185 lignes, 11 composants, layout), `src/components/admin/floor-plan/ServiceFloorPlan.tsx`, `src/components/admin/ClientModal.tsx`, `MessageTab.tsx`, `TagSelectorPopup.tsx`, `VersionChecker.tsx`, système de toasts, et les fonctions Convex appelées (`admin.listReservations`, `admin.updateReservation`, `admin.updateReservationFull`, `admin.createReservationQuick`, `floorplan.getTableStates/assign/unassign/swap`, `slots.listByDate/addSlot/batchUpdateSlots`, `weeklyTemplates.ensureSlotsForDate`, `clients.get/search`, `planning.getMonthEffective`).

**Méthode** : analyse statique rigoureuse, avec pour chaque constat le symptôme tel que le personnel le voit en salle, la reproduction, la cause dans le code et la correction. Aucune exécution sur iPad n'a été possible (pas de déploiement Convex accessible) : les constats marqués CONFIRMÉ sont démontrés par le code, ceux marqués PROBABLE dépendent d'une condition d'environnement indiquée.

**Sévérités (spécifiques à cet audit d'interface)** : **P0** = une action écrit une donnée fausse ou modifie la mauvaise réservation · **P1** = une action échoue, est inaccessible ou n'a aucun effet visible · **P2** = affichage trompeur ou ergonomie qui bloque au toucher · **P3** = cosmétique.

Abréviations de fichiers : **P** = `src/app/admin-tablette/reservations/page.tsx` · **S** = `src/components/admin/floor-plan/ServiceFloorPlan.tsx` · **CM** = `src/components/admin/ClientModal.tsx` · **DSP** = `src/app/admin-tablette/components/DaySettingsPopup.tsx` · **ERP** = `src/app/admin-tablette/components/EditReservationPopup.tsx` · **TCR** = `src/app/admin-tablette/components/TabletCreateReservationPopup.tsx` · **BELL** = `src/app/admin-tablette/components/TabletNotificationBell.tsx`.

---

## 1. Synthèse — les points bloquants

| ID | Sév. | Symptôme en salle | Confiance |
|---|---|---|---|
| TAB-001 | P0 | On sélectionne une réservation dans la liste, on touche une table : c'est **une autre réservation** qui est déplacée, parfois d'un autre jour | CONFIRMÉ |
| TAB-002 | P0 | Une réservation sélectionnée pour assignation reste sélectionnée quand on change de service ou de jour : on l'assigne sur le mauvais plan | CONFIRMÉ |
| TAB-003 | P0 | Toute modification d'une réservation depuis la tablette écrit une clé de créneau invalide ; depuis la fiche client, passer de midi à soir laisse la réservation dans « Midi » | CONFIRMÉ |
| TAB-004 | P1 | Le menu « Changer le statut » propose des choix qui échouent systématiquement avec « Champ invalide : status » | CONFIRMÉ |
| TAB-005 | P1 | Le bouton d'état rapide (icône) ne fait parfois rien, sans message | CONFIRMÉ |
| TAB-006 | P1 | Au-delà de 50 réservations par service, des lignes manquent et les compteurs sont faux | CONFIRMÉ |
| TAB-007 | P1 | On touche une réservation, la fiche s'ouvre sur « Aucune réservation sélectionnée » | CONFIRMÉ |
| TAB-008 | P1 | Depuis la recherche client, la fiche s'ouvre toujours sur un onglet vide | CONFIRMÉ |
| TAB-009 | P1 | Les messages de confirmation ou d'erreur apparaissent **derrière** les fenêtres ouvertes | CONFIRMÉ |
| TAB-010 | P1 | Réglages du jour : le créneau ajouté n'apparaît pas ; une erreur d'enregistrement ne s'affiche jamais | CONFIRMÉ |
| TAB-011 | P1 | Réglages du jour : sur un jour fermé, les interrupteurs ne réagissent pas | CONFIRMÉ |
| TAB-012 | P1 | Fiche client : champ date natif iOS (déjà identifié comme cassé ailleurs), heure affichée fausse quand elle n'est pas dans la liste fixe | CONFIRMÉ |
| TAB-020 | P2 | Fiche client : la saisie en cours est effacée toutes les quelques minutes pendant le service | CONFIRMÉ |

---

## 2. Findings détaillés

### A. Actions qui écrivent une donnée fausse ou touchent la mauvaise réservation

**TAB-001 · P0 · CONFIRMÉ — Le mode « déplacement » du plan de salle n'est jamais réinitialisé et prend le pas sur l'assignation depuis la liste**
- Localisation : S:109 (`editingTable`), S:178-179 (seul `pendingTableIds` est réinitialisé sur changement de réservation/jour/service/zone), S:295 (`if (editingTable) { … return; }` traité **avant** le flux d'assignation), S:383 (`editingTable ? handleConfirmMove : handleConfirmAssign`), S:406 (`isEditingThisTable = editingTable?.tableId === table.tableId`).
- Symptôme : (a) on touche une table occupée pour la « modifier », puis on touche la colonne « ASSIG. » d'une autre ligne, puis une table libre : le bandeau affiche « Déplacer » et c'est la **première** réservation qui est déplacée, pas celle sélectionnée dans la liste. (b) On touche une table occupée, on change de jour : la même table physique apparaît en orange « en cours de modification » sur le nouveau jour ; toucher une autre table déplace la réservation **de la veille** (la version est prise en repli sur une valeur périmée, S:194 et S:217, d'où un conflit de version ou un déplacement effectif).
- Cause : `editingTable` n'est vidé que par un second toucher sur la même réservation ou par le succès d'une mutation ; ni le parent ni le composant ne le réinitialisent quand `selectedReservationId`, `dateKey` ou `service` changent.
- Correction : `useEffect(() => { setEditingTable(null); setPendingTableIds([]); }, [dateKey, service, selectedReservationId])` ; afficher un bandeau explicite « Déplacement de X — Annuler » tant que le mode est actif ; refuser d'entrer en mode déplacement si une réservation est déjà sélectionnée dans la liste.

**TAB-002 · P0 · CONFIRMÉ — La réservation sélectionnée pour assignation survit au changement de service ou de jour**
- Localisation : P:215 (`selectedForAssignment`, aucun effet de réinitialisation), P:1107-1113 (le plan reçoit `service={selectedService}` et `selectedReservationId` indépendamment).
- Symptôme : on touche « ASSIG. » sur une réservation du midi, on bascule sur « Soir », on touche une table qui semble libre : le serveur assigne la réservation du **midi** (il utilise la date et le service de la réservation, `convex/floorplan.ts` `assign`), alors que le plan affiché était celui du soir. Idem après un changement de jour. Résultat : une table 2/2 au midi que personne n'a vue, ou un conflit lors du prochain placement.
- Correction : `useEffect(() => setSelectedForAssignment(null), [dateKey, selectedService])` ; masquer la colonne « ASSIG. » en vue « Total » (le plan n'y est pas affiché, la sélection y est sans effet).

**TAB-003 · P0 · CONFIRMÉ — Toute modification depuis la tablette passe par `updateReservationFull`, qui écrit une clé de créneau invalide ; la fiche client ne change jamais le service**
- Localisation : ERP:85 et CM:226-241 (appel), `convex/admin.ts:1081` (`slotKey = \`${dateKey}:${service}:${timeKey}\``, séparateur `:` au lieu de `#`), `convex/admin.ts:1073` (`partySize = adults + childrenCount`, bébés exclus), CM:843-855 (`<select>` d'heures mêlant midi et soir, aucun sélecteur de service).
- Symptôme visible : dans la fiche client, changer 12:30 en 19:00 laisse `service = lunch` : la réservation s'affiche sous « Midi » à 19:00, avec un groupe horaire « 19:00 » dans la colonne du midi. Symptôme invisible : la réservation modifiée n'est plus comptée dans la capacité du widget ni des créations admin (surbooking silencieux, voir BUG-001 de l'audit général).
- Correction : côté serveur, réutiliser `makeSlotKey` et `computePartySize` et dériver le service de l'heure ou l'exiger ; côté tablette, faire converger la fiche client sur `EditReservationPopup` (qui a un sélecteur de service) et supprimer le formulaire dupliqué de `ClientModal`.

### B. Actions qui échouent, n'ont pas d'effet ou sont inaccessibles

**TAB-004 · P1 · CONFIRMÉ — Menu « Changer le statut » : options refusées par le serveur, pseudo-statut trompeur, choix sans effet**
- Localisation : P:806-849 (liste et `getHiddenStatuses`), P:859-862, `convex/lib/stateMachine.ts:22-32`.
- Options proposées qui échouent toujours (toast « Champ invalide : status (Invalid transition from … ) ») :

| Statut actuel | Options proposées qui échouent |
|---|---|
| En attente | Carton, Installé, Terminé, No-show, Incident |
| Confirmé | Refusé, Incident |
| Carton placé | Refusé |
| Installé | Refusé |
| Terminé | No-show, Refusé |
| No-show | Terminé, Refusé, Incident |
| **Annulé** | Installé, Terminé, No-show, Refusé, Incident (5 sur 6) |
| Refusé | Installé, Terminé, No-show, Incident |
| Incident | Table assignée, No-show, Refusé |

- Autres défauts : « Table assignée / Prêt pour accueil » est un pseudo-statut (P:809) proposé comme action de **restauration** depuis Annulé, No-show et Terminé (il envoie `confirmed`, ce qui fonctionne mais avec un libellé absurde) ; depuis « Confirmé sans table », le même choix ne fait strictement rien (P:860 : `targetStatus === res.status`) ; depuis « Carton placé », le retour à « Confirmé », autorisé par le serveur, est masqué.
- Cause : quatrième table de transitions maintenue à la main au lieu d'utiliser `getValidTransitions()` (fonction pure importable côté client).
- Correction : `allStatuses.filter(s => s.status === current || getValidTransitions(current).includes(s.status))` ; supprimer le pseudo-statut « assigned » (l'information « table assignée » est déjà portée par la colonne TABLE).

**TAB-005 · P1 · CONFIRMÉ — Bouton d'état rapide sans `await`, sans gestion d'erreur, sans état optimiste**
- Localisation : P:756-765.
- Symptôme : un double toucher envoie deux mutations avec la même version, la seconde échoue en `VERSION_CONFLICT` en silence ; une coupure réseau ou une modification concurrente depuis un autre appareil échoue sans aucun message ; la ligne ne change pas de couleur avant la réponse du serveur, ce qui pousse à retoucher.
- Correction : appeler `handleStatusChange(res._id, nextStatus, res.version)` (P:283-309), qui gère déjà l'optimisme, le rollback et le toast ; désactiver le bouton pendant l'appel.

**TAB-006 · P1 · CONFIRMÉ — Liste plafonnée à 50 réservations par service, sans indication**
- Localisation : P:239-249 (`usePaginatedQuery` avec `initialNumItems: 50`, `loadMore` jamais appelé).
- Symptôme : sur un service chargé, les réservations au-delà de la 50e (ordre de création) n'apparaissent pas ; les compteurs « Midi/Soir/Total » et les « X / capacité » par heure sont sous-estimés ; la cloche « voir en contexte » ne surligne rien pour ces réservations (P:498-504).
- Correction : `initialNumItems: 200` + `loadMore` automatique tant que `status === "CanLoadMore"`, ou requête non paginée bornée par jour et service (le volume par service est petit).

**TAB-007 · P1 · CONFIRMÉ — Fiche client ouverte depuis une ligne : onglet « Réservation » vide**
- Localisation : P:608-615 (`handleRowClick` passe `res.clientId`), `convex/admin.ts:457` (`clientId` renvoyé = client trouvé **par téléphone**, sinon `doc.clientId`), `convex/clients.ts:159-163` (réservations du client cherchées par le champ `clientId` stocké, `take(50)`), CM:110 (`find` sur cette liste).
- Symptôme : « Aucune réservation sélectionnée » alors qu'on vient de toucher une réservation. Se produit quand (a) le client trouvé par téléphone n'est pas celui stocké dans `reservation.clientId` (téléphone modifié, client fusionné, ancienne réservation), ou (b) le client a plus de 50 réservations (les plus récentes par date de création sont conservées, pas par date de repas).
- Correction : passer la réservation complète au modal plutôt que de la rechercher dans la liste du client ; ajouter l'index `reservations.by_clientId` et trier par `dateKey`.

**TAB-008 · P1 · CONFIRMÉ — Depuis la recherche client, la fiche s'ouvre sur un onglet vide**
- Localisation : P:1158-1161 (`reservationId: "" as any`), CM:70 (onglet par défaut « reservation »).
- Symptôme : chaque recherche aboutit à « Aucune réservation sélectionnée » ; il faut toucher « Historique » à chaque fois.
- Correction : `currentReservationId` optionnel et onglet par défaut `history` quand il est absent.

**TAB-009 · P1 · CONFIRMÉ — Les toasts sont rendus sous les fenêtres modales**
- Localisation : `src/components/ui/toast.tsx:86` (`z-[100]`) ; fenêtres : ERP/TCR/DSP `z-[200]`, CM:261 `z-[100000]`, BELL:103 `z-[100000]`, menu de statut P:789-791 `z-[99999]/[100000]`. Tous en `position: fixed` dans le contexte d'empilement racine : la comparaison de `z-index` est globale.
- Symptôme : « Enregistrer » dans la fiche client affiche « Réservation mise à jour » **derrière** le voile noir à 50 %, en bas à droite, non cliquable ; une erreur dans la fenêtre de modification (conflit de version, créneau) est assombrie derrière le voile à 40 % ; « Valider » dans la cloche affiche son message derrière le panneau. Impression fréquente : « j'ai enregistré et rien ne s'est passé ».
- Correction : `z-[200000]` sur le conteneur de toasts, ou rendre les toasts dans un portail monté après tout le reste.

**TAB-010 · P1 · CONFIRMÉ — Réglages du jour : créneau ajouté invisible, erreurs silencieuses**
- Localisation : DSP:56 (`hasInitialized.current = true` : l'état local n'est plus jamais resynchronisé), DSP:142-152 (`addSlot` sans mise à jour de l'état local, erreur en `console.error`), DSP:174 (`handleSave` : erreur en `console.error`, la fenêtre reste ouverte sans message).
- Symptôme : on ajoute « 14:30 / 50 », le formulaire se ferme, le créneau n'apparaît pas tant qu'on ne ferme et rouvre pas la fenêtre ; ajouter une heure déjà existante (« Ce créneau existe déjà ») ne produit rien ; un échec d'enregistrement laisse la fenêtre ouverte, bouton redevenu actif, sans explication.
- Correction : après `addSlot`, pousser le créneau dans `lunchSlots`/`dinnerSlots` (ou lever `hasInitialized`) ; `toast.error(formatConvexError(e))` dans les deux `catch`.

**TAB-011 · P1 · CONFIRMÉ — Réglages du jour : interrupteurs inertes sur un jour fermé**
- Localisation : DSP:99-110 (`handleDayToggle`/`handleServiceToggle` transforment les créneaux existants ; `checked` est dérivé de ces créneaux).
- Symptôme : sur un jour sans créneau (fermé par template), « Jour complet » et « Déjeuner/Dîner » ne bougent pas quand on les touche ; le seul moyen d'ouvrir est d'ajouter chaque créneau à la main via « + » (avec capacité par défaut 50, DSP:51, sans rapport avec les templates).
- Effet secondaire : fermer puis rouvrir un service écrit des overrides manuels `{isOpen:true}` qui détachent définitivement ces créneaux du template et les immunisent contre les périodes de fermeture (BUG-006 de l'audit général).
- Correction : proposer « Ouvrir selon le template » (génération des créneaux du template du jour) et « Revenir au template » (suppression des overrides manuels) ; désactiver visuellement les interrupteurs quand il n'y a aucun créneau.

**TAB-012 · P1 · CONFIRMÉ — Formulaire de réservation de la fiche client : champ date natif iOS, heures fixes, total sans bébés**
- Localisation : CM:835-840 (`<input type="date">`), CM:784-787 (`TIME_SLOTS` 11:30–13:30 et 18:30–21:00), CM:846-854 (`<select>`), CM:934-936 (`Total: adults + childrenCount`).
- Preuve d'antécédent : commits `ad9ba8b` et `4a9a8c4` (« iOS15 : remplacer input[type=date] natif ») ont corrigé ce problème dans `EditReservationPopup` seulement ; le formulaire de la fiche client, qui est **le chemin principal** (toute réservation ayant un client), l'a conservé.
- Symptôme : sur iPad iOS 15, le sélecteur de date natif se comporte mal (constat historique du projet) ; une réservation à 14:00, 18:00 ou 21:30 affiche « 11:30 » dans la liste déroulante (première option), alors que la valeur réelle est conservée tant qu'on ne touche pas la liste ; le total affiché diffère de la colonne « couverts » de la liste dès qu'il y a un bébé.
- Correction : supprimer ce formulaire au profit de `EditReservationPopup` (TAB-003), dont les heures devraient elles-mêmes venir de `slots.listByDate` du jour choisi.

### C. Affichage faux ou trompeur

**TAB-013 · P2 · CONFIRMÉ — Réservations refusées comptées et listées comme actives**
- Localisation : P:343-364 (filtres `!["cancelled","noshow"]`), P:518-519 (groupes « actifs » vs « Annulations / No-show »).
- Symptôme : une réservation « Refusé » reste dans les groupes horaires, gonfle « X / capacité » de son heure et les compteurs Midi/Soir/Total. Même chose pour « Incident ».
- Correction : une fonction unique `isCountedCover(status)` partagée par les trois surfaces admin (les trois ont aujourd'hui des règles différentes).

**TAB-019 · P2 · CONFIRMÉ — Téléphone et e-mail de la réservation inaccessibles depuis la liste**
- Localisation : P:272 (`toggleExpand` jamais appelé), P:892-906 (bloc « Expanded details » inatteignable).
- Symptôme : il faut ouvrir la fiche client complète pour lire un numéro ; pour une réservation sans client, ouvrir la fenêtre de modification.
- Correction : afficher le téléphone en ligne 2 ou brancher l'expansion.

**TAB-021 · P2 · CONFIRMÉ — Échange de tables immédiat, sans confirmation ni contrôle serveur**
- Localisation : S:319 (`await handleSwapReservations(table)` dès qu'on touche une table pleine en mode déplacement), `convex/floorplan.ts` `swap` (aucune vérification de statut, de service ou de plafond).
- Symptôme : un toucher sur une table pleine par erreur échange deux réservations sans question ; combiné à TAB-001, l'échange peut impliquer une réservation d'un autre jour.
- Correction : bandeau de confirmation « Échanger A et B ? » ; vérifications serveur (même jour/service, statuts assignables).

**TAB-022 · P2 · CONFIRMÉ — Retirer une affectation force le statut à « Confirmé »**
- Localisation : `convex/floorplan.ts` `unassign` (`status: "confirmed"` quel que soit le statut précédent).
- Symptôme : le bouton rouge « X » sur une table dont le client est installé ramène la ligne à « Confirmé » ; `seatedAt` est conservé, la statistique de durée de repas est faussée ; sur une réservation « En attente », cela vaut validation sans e-mail.
- Correction : `unassign` ne doit toucher que `tableIds`/`primaryTableId`.

**TAB-018 · P2 · CONFIRMÉ (si nommage concerné) — Tables dont le nom commence par « D » suivi d'un chiffre ou d'un tiret masquées du plan**
- Localisation : S:132 et S:145 (`/^D[0-9-]/` : filtre « tables de test »).
- Symptôme : une table réellement nommée « D1 », « D-2 »… n'apparaît jamais sur le plan tablette, tout en existant dans la configuration.
- Correction : supprimer le filtre ; marquer les tables de test par un champ, pas par leur nom.

**TAB-024 · P3 · CONFIRMÉ — Création rapide : source toujours « walk-in », langue « FR » par défaut, capacité « 2 / 0 »**
- Localisation : TCR:72 (`source: "walkin"` même pour une réservation prise au téléphone), TCR:26-27 (heures fixes différentes de celles de la modification), P:543 (`groupCapacity || 0` pour une heure sans créneau : « 2 / 0 »).

**TAB-023 · P3 — Messages techniques exposés** : « Statut mis à jour: cardPlaced » (P:299), « Champ invalide : status (Invalid transition from…) » (`src/lib/formatError.ts`).

### D. Ergonomie tactile et iPad

**TAB-020 · P2 · CONFIRMÉ — La saisie en cours dans la fiche client est effacée par les mises à jour temps réel**
- Localisation : CM:113-130 (`useEffect` sur `currentReservation` qui réinitialise `formData` à chaque changement de la query `clients.get`).
- Symptôme : pendant le service, toute écriture sur **n'importe quelle** réservation du client (autre appareil, cloche, et surtout le cron d'auto-libération qui tourne **toutes les 5 minutes** et patche des réservations) remet le formulaire à zéro en pleine frappe. Même pattern dans `DaySettingsPopup` corrigé avec `hasInitialized` : la correction connue n'a pas été portée ici.
- Correction : initialiser une seule fois (`key={reservation._id}` sur le formulaire, ou garde `hasInitialized`).

**TAB-014 · P2 · CONFIRMÉ — Suppression d'une note invisible au toucher ; bouton « + » sans action ; erreurs non gérées**
- Localisation : CM:479 (`opacity-0 group-hover:opacity-100` : pas de survol sur iPad), CM:459 (icône « + » sans `onClick`), CM:153-161 (`handleAddNote`/`handleDeleteNote` sans `try/catch` ni toast).
- Symptôme : la corbeille d'une note n'apparaît qu'après un premier toucher « à l'aveugle » sur la note (émulation de survol iOS), et pas de façon fiable ; le « + » ne fait rien, seule la touche Entrée du clavier ajoute une note ; un échec est muet.
- Correction : corbeille toujours visible sur écran tactile (`@media (hover: none)`), bouton « Ajouter » explicite, gestion d'erreur.

**TAB-016 · P2 · PROBABLE — Hauteur `h-screen` sur iOS Safari hors mode plein écran**
- Localisation : `src/app/admin-tablette/components/TabletLayoutClient.tsx:35` (`h-screen overflow-hidden`), bandeau « Assigner » en `absolute bottom-4` (S).
- Condition : si la tablette utilise Safari avec ses barres plutôt que l'app installée sur l'écran d'accueil.
- Symptôme : `100vh` dépasse la zone visible : les dernières lignes de la liste et le bandeau « X tables — Assigner / Annuler » sont masqués derrière la barre d'outils. En mode plein écran (PWA installée), le problème n'existe pas.
- Correction : `h-[100dvh]` avec repli `100vh`.

**TAB-017 · P2 · PROBABLE — Recherche client par numéro local infructueuse**
- Localisation : `convex/clients.ts:256-260` (index de recherche plein texte sur `searchText` contenant `+32470123456`), `ClientSearchPopup.tsx:709-712`.
- Condition : à vérifier sur les données réelles.
- Symptôme attendu : taper « 0470 » ou « 470 12 » ne trouve rien ; seul un préfixe du numéro international complet (« +3247 ») fonctionne.
- Correction : indexer aussi le numéro sans indicatif et en variantes, ou recherche exacte par téléphone normalisé en parallèle du plein texte.

**TAB-027 · P3 · CONFIRMÉ — Zoom bloqué et textes minuscules sur le plan**
- Localisation : `src/app/admin-tablette/layout.tsx:16-22` (`userScalable: false`, `maximumScale: 1`), S (`text-[7px]`, `text-[8px]`, `text-[9px]`, `text-[10px]` sur les tables, mis à l'échelle par `tabletScale`).

**TAB-015 · P2 · CONFIRMÉ — Aucune déconnexion sur la tablette** (`TabletLayoutClient.tsx` : `signOut` importé, jamais rendu ; session 30 jours). Déjà relevé dans l'audit général.

### E. Lenteur perçue

**TAB-025 · P3 · CONFIRMÉ — Le calendrier mensuel reste abonné après la première ouverture**
- Localisation : `CalendarPopup.tsx:56-59` (`currentYear/currentMonth` jamais remis à `null`), P:1127 (composant toujours monté), `convex/planning.ts` (`getMonthEffective` lit tous les créneaux et toutes les réservations, plus des logs DEBUG).
- Effet : après une première ouverture du calendrier, chaque écriture de réservation, sur n'importe quel jour, déclenche un recalcul complet côté serveur et un renvoi à la tablette ; sur un historique qui grossit, c'est une source de latence et, à terme, d'erreur « Server Error » (PERF-001 de l'audit général).

**TAB-026 · P3 · CONFIRMÉ — Une écriture à chaque changement de jour** : P:229-234 (`ensureSlots` en `useEffect`), doublée par DSP:38-44 à l'ouverture des réglages ; chaque appel lit tous les overrides du restaurant.

### F. Sans effet visible aujourd'hui, à corriger avec le reste

**TAB-028 · P3** — `Stepper` défini à l'intérieur du rendu (TCR:86), `useToast` appelé après un `return` conditionnel (CM:163) : le React Compiler refuse ces composants, aucune casse visible pour l'instant. Composants orphelins `ActionPopup.tsx`, `SegmentedBar.tsx`, `StatusPill.tsx` dans `admin-tablette/components`. Menus `getPrimaryAction/getSecondaryAction/getMenuActions/getAllActions` (P:377-483) calculés à chaque rendu et jamais utilisés.

---

## 3. Ce que je n'ai pas pu vérifier

- Le rendu réel sur iPad (iOS 15 et récents) : les nombreux contournements `-webkit-flex` dans `globals.css` indiquent des problèmes de mise en page rencontrés sur Safari ancien ; sans appareil ni déploiement, je ne peux pas dire s'il en reste.
- Le comportement du clavier virtuel avec les fenêtres en `position: fixed` (champs masqués par le clavier) : fréquent sur iOS, non démontrable statiquement.
- La présence effective de réservations avec `slotKey` contenant `:` (TAB-003) et de clients avec plus de 50 réservations (TAB-007) : requêtes directes en base nécessaires.

---

## 4. Ordre de correction recommandé

1. **TAB-001, TAB-002** : deux `useEffect` de réinitialisation (une heure de travail, supprime le risque de déplacer la mauvaise réservation).
2. **TAB-003, TAB-012** : réparer `updateReservationFull` côté serveur, remplacer le formulaire de la fiche client par `EditReservationPopup`, script de correction des `slotKey`.
3. **TAB-009** : `z-index` des toasts (une ligne) — rend visibles toutes les erreurs que les points suivants révèlent.
4. **TAB-004, TAB-005** : menu dérivé de `getValidTransitions`, bouton rapide via `handleStatusChange`.
5. **TAB-006, TAB-007, TAB-008** : pagination, passage de la réservation au modal, onglet par défaut.
6. **TAB-010, TAB-011, TAB-020, TAB-014** : réglages du jour et fiche client.
7. **TAB-013, TAB-019, TAB-021, TAB-022** : compteurs, détails, garde-fous du plan.
8. Le reste.

Une fois 1 à 4 faits, les cinq scénarios de bout en bout proposés dans l'échange précédent (réserver, déplacer depuis la tablette, fermer un jour, parcourir chaque statut, laisser une table sans arrivée) deviennent le filet de non-régression de cette interface.
