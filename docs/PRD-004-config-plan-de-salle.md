PRD Complet : Configuration du Plan de Salle et Système de Combinaison des Tables
Version 1.0 — La Moulinière
Table des matières
Vue d'ensemble
Architecture globale
Modèle de données
Page de configuration du plan de salle
Système de combinaison des tables
Intégration avec la page Réservations
Algorithmes
API Backend (Convex)
Composants UI
Constantes et configuration
Fichiers sources
1. Vue d'ensemble
1.1 Objectif
Fournir une interface complète permettant de :

Configurer visuellement le plan de salle du restaurant via drag & drop
Combiner automatiquement plusieurs tables adjacentes pour les grands groupes
Assigner des tables aux réservations avec détection intelligente multi-tables
1.2 Utilisateurs cibles
Rôle	Actions
Administrateur	Configuration du plan, création/modification des tables
Personnel de salle	Assignation des tables aux réservations
1.3 Principes clés
Grille magnétique : Positionnement précis par snap-to-grid
Combinaison directionnelle : Tables combinables sur un axe (H/V)
Adjacence stricte : Seules les tables physiquement adjacentes se combinent
Affichage simplifié : La page Réservations affiche uniquement la table "master"
2. Architecture globale
2.1 Diagramme de flux
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PAGE CONFIGURATION                                   │
│                    /admin/parametres/tables                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────┐   ┌────────────────────────────────┐│
│  │         PLAN DE SALLE              │   │      PANNEAU ÉDITION           ││
│  │  ┌─────────────────────────────┐   │   │  ┌──────────────────────────┐  ││
│  │  │     Grille 768×640px        │   │   │  │ • Nom: T1                │  ││
│  │  │  ┌────┐  ┌────┐  ┌────┐     │   │   │  │ • Capacité: 4            │  ││
│  │  │  │ T1 │──│ T2 │──│ T3 │     │   │   │  │ • Zone: Salle            │  ││
│  │  │  └────┘  └────┘  └────┘     │   │   │  │ • Combinaison: Horiz.    │  ││
│  │  │     │                       │   │   │  │ • Position: X:10, Y:5    │  ││
│  │  │  ┌────┐                     │   │   │  └──────────────────────────┘  ││
│  │  │  │ T4 │  (Drag & Drop)      │   │   │                                ││
│  │  │  └────┘                     │   │   │  [Valider] [Dupliquer]         ││
│  │  └─────────────────────────────┘   │   │  [Désactiver]                  ││
│  │  [Stats: 12 tables | 60 places]    │   │                                ││
│  └────────────────────────────────────┘   └────────────────────────────────┘│
│                                                                              │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       │ Données sauvegardées
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CONVEX DATABASE                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ tables: { name, capacity, zone, positionX, positionY,                   ││
│  │           combinationDirection, isActive, ... }                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       │ Lecture des tables
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PAGE RÉSERVATIONS                                    │
│                    /admin/service (RestoBook)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Réservation: Dupont (6 pers.)  │ Table: [T1] │ [Arrivé] [No-show]       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│         │                                    ▲                               │
│         │ Clic sur "Table"                   │ Affiche table master          │
│         ▼                                    │ uniquement                    │
│  ┌──────────────────────┐                    │                               │
│  │ PLAN DE SALLE        │    Algorithme      │                               │
│  │ (Mode assignation)   │───────────────────►│                               │
│  │                      │  Auto-sélection    │                               │
│  │ Clic T1 (2 places)   │  T1+T2+T3 = 6p    │ tableIds: [T1, T2, T3]        │
│  │ → sélection auto     │                    │ Affichage: "T1"               │
│  │   T1+T2+T3           │                    │                               │
│  └──────────────────────┘                    │                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

3. Modèle de données
3.1 Table (tables)
interface Table {
  _id: Id<"tables">;
  _creationTime: number;
  
  // ═══════════════════════════════════════════
  // IDENTIFICATION
  // ═══════════════════════════════════════════
  name: string;              // "T1", "T2", "VIP", "101"
  capacity: number;          // 1-20 personnes
  zone: Zone;                // "salle" | "terrasse" | "interieur"
  
  // ═══════════════════════════════════════════
  // POSITIONNEMENT (Grille)
  // ═══════════════════════════════════════════
  positionX: number;         // Colonne (0-45 en unités de cellule)
  positionY: number;         // Ligne (0-37 en unités de cellule)
  rotation?: 0 | 90;         // Rotation optionnelle
  shape?: "rect" | "round";  // Forme optionnelle
  width?: number;            // Cellules horizontales (défaut: 1)
  height?: number;           // Cellules verticales (défaut: 1)
  
  // ═══════════════════════════════════════════
  // COMBINAISON
  // ═══════════════════════════════════════════
  combinationDirection?: CombinationDirection;
  // "horizontal" : Combinable gauche-droite (même Y)
  // "vertical"   : Combinable haut-bas (même X)
  // "none"       : Non combinable (isolée)
  
  // ═══════════════════════════════════════════
  // LOCALISATION LOGIQUE (Déménagement-Proof)
  // ═══════════════════════════════════════════
  zoneId?: string;           // Ex: "ZONE_1G", "TERRASSE_SUD"
  features?: string[];       // Ex: ["fenetre", "calme", "vue_mer"]
  
  // ═══════════════════════════════════════════
  // ÉTAT
  // ═══════════════════════════════════════════
  isActive: boolean;
  
  // ═══════════════════════════════════════════
  // TIMESTAMPS
  // ═══════════════════════════════════════════
  createdAt: number;
  updatedAt: number;
}

type Zone = "interieur" | "salle" | "terrasse";
type CombinationDirection = "vertical" | "horizontal" | "none";

3.2 Réservation (reservations) — Champs liés aux tables
interface ReservationTableFields {
  // Tables assignées (peut être multiple pour combinaison)
  tableIds?: Id<"tables">[];
  // Exemples:
  // - []           → Pas encore assigné
  // - ["T1"]       → Table unique
  // - ["T1","T2","T3"] → Combinaison (3 tables)
}

3.3 Log d'assignation (assignmentLogs)
interface AssignmentLog {
  reservationId: Id<"reservations">;
  assignedTableIds: Id<"tables">[];
  
  // Info de groupement (pour analytics ML)
  groupingInfo: {
    isCombination: boolean;      // true si multi-tables
    masterTableId: Id<"tables">; // Première table (affichée)
    direction: CombinationDirection;
    chainLength: number;         // Nombre de tables combinées
  };
  
  // Contexte d'apprentissage
  tablesAvailableIds: Id<"tables">[];  // Options disponibles
  tablesTakenIds: Id<"tables">[];      // Déjà occupées
  serviceOccupancy: number;            // % remplissage
}

4. Page de configuration du plan de salle
4.1 Layout
┌─────────────────────────────────────────────────────────────────────────────┐
│  Plan de salle          [Salle|Terrasse|Tous] [⚡ Désactiver terrasse] [+]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────┐  ┌──────────────────────┐ │
│  │                                              │  │      Édition         │ │
│  │            GRILLE 768×640px                  │  │  ─────────────────   │ │
│  │                                              │  │                      │ │
│  │     ┌────┐  ┌────┐  ┌────┐                   │  │  Table T1       [×]  │ │
│  │     │ T1 │──│ T2 │──│ T3 │  (horiz.)        │  │  ─────────────────   │ │
│  │     └────┘  └────┘  └────┘                   │  │                      │ │
│  │        │                                     │  │  Nom: [T1        ]   │ │
│  │     ┌────┐                                   │  │  Capacité: [4    ]   │ │
│  │     │ T4 │  (vert.)                          │  │                      │ │
│  │     └────┘                                   │  │  Zone:               │ │
│  │        │                                     │  │  [Salle] [Terrasse]  │ │
│  │     ┌────┐                                   │  │                      │ │
│  │     │ T5 │                                   │  │  Combinaison:        │ │
│  │     └────┘                                   │  │  [Aucune][H.][Vert.] │ │
│  │                                              │  │                      │ │
│  │                       ┌────────┐             │  │  Position: X:10 Y:5  │ │
│  │                       │  VIP   │             │  │  (lecture seule)     │ │
│  │                       │  8p    │             │  │                      │ │
│  │                       └────────┘             │  │  Statut: [Active]    │ │
│  │                                              │  │                      │ │
│  └──────────────────────────────────────────────┘  │  ─────────────────   │ │
│  ─────────────────────────────────────────────────  │  [    Valider    ]   │ │
│  [📊 12 tables] | [🏠 40 int.] | [☀️ 20 terr.] | [👥60]│  [   Dupliquer   ]   │ │
│                                                     │  [  Désactiver   ]   │ │
│                                                     └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

4.2 Spécifications de la grille
Paramètre	Valeur	Description
GRID_CELL_SIZE	16px	Unité de positionnement
TABLE_SIZE	48px	Taille visuelle d'une table
TABLE_GRID_SPAN	3	Cellules par table (48/16)
GRID_COLS	48	Colonnes totales
GRID_ROWS	40	Lignes totales
GRID_WIDTH	768px	Largeur (48×16)
GRID_HEIGHT	640px	Hauteur (40×16)
4.3 Styles visuels par zone
Zone	Fond	Bordure	Texte
salle / interieur	bg-amber-100	border-amber-400	text-amber-800
terrasse	bg-emerald-100	border-emerald-400	text-emerald-800
4.4 Lignes de combinaison
Les tables combinables affichent des lignes de connexion :

Direction	Couleur	Style
Vertical	#3B82F6 (bleu)	Pointillés 6 4
Horizontal	#8B5CF6 (violet)	Pointillés 6 4
Logique d'affichage :

Pour chaque table avec combinationDirection ≠ "none":
  Si vertical → Chercher table adjacente en dessous (ΔY = TABLE_GRID_SPAN)
  Si horizontal → Chercher table adjacente à droite (ΔX = TABLE_GRID_SPAN)
  Si trouvée → Tracer ligne entre les centres

4.5 Drag & Drop
Configuration DnD Kit
// Sensors
useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
useSensor(KeyboardSensor, { coordinateGetter: gridKeyboardCoordinates });

// Modifiers
modifiers={[snapToGridModifier, restrictToParentElement]}

États visuels pendant le drag
État	Rendu
Table normale	Zone color, cursor-grab, hover:scale-[1.02]
Table en drag	opacity-50, border-dashed
Ghost (overlay)	Zone color + border-blue-500 ou border-red-500
Drop valid	border-green-400, bg-green-100/50, icône ✓
Drop invalid	border-red-400, bg-red-100/50, icône ✗
Haptic feedback
Événement	Pattern
Grab	triggerHaptic("grab")
Drop valide	triggerHaptic("drop")
Drop invalide	triggerHaptic("error")
4.6 Panneau d'édition (416px)
Champs
Champ	Type	Validation
Nom	Input text	Required, unique recommandé
Capacité	Input number	1-20
Zone	Button group	salle / terrasse
Combinaison	Button group	Aucune / Horiz. / Vert.
Position	Read-only	Affiché X, Y
Statut	Badge	Active / Désactivée
Actions
Bouton	Action	Style
Valider	updateTable()	Primary noir
Dupliquer	duplicateTable()	Outline
Désactiver	deactivateTable()	Outline rouge
Réactiver	activateTable()	Outline vert
4.7 Barre de statistiques
[📊 {active} tables] | [🏠 {interieur.capacity} intérieur] | [☀️ {terrasse.capacity} terrasse] | [👥 {totalCapacity} total]

5. Système de combinaison des tables
5.1 Concept
La combinaison permet de grouper automatiquement plusieurs tables adjacentes quand la capacité d'une seule table est insuffisante pour un groupe.

Règles fondamentales
Règle	Description
Direction	Une table est combinable sur UN axe : horizontal OU vertical
Adjacence	Les tables doivent être physiquement adjacentes (ΔPos = 1)
Même zone	Toutes les tables combinées doivent être dans la même zone
Actives	Toutes les tables doivent être actives
Disponibles	Aucune table ne doit être déjà assignée au même service
5.2 Directions de combinaison
HORIZONTAL (même Y, X croissant)
┌────┐  ┌────┐  ┌────┐
│ T1 │──│ T2 │──│ T3 │   → Capacité combinée: T1 + T2 + T3
└────┘  └────┘  └────┘

VERTICAL (même X, Y croissant)
┌────┐
│ T1 │
└──│─┘
   │
┌──│─┐
│ T2 │   → Capacité combinée: T1 + T2 + T3
└──│─┘
   │
┌──│─┐
│ T3 │
└────┘

AUCUNE (table isolée)
┌────┐
│ T1 │   → Non combinable, capacité fixe
└────┘

5.3 Algorithme de sélection automatique
Frontend (findAdjacentTables)
function findAdjacentTables(
  clickedTable: TableInfo,      // Table cliquée par l'utilisateur
  allTables: TableInfo[],       // Toutes les tables du plan
  neededCapacity: number,       // Taille du groupe
  alreadyAssignedIds: Set<string>  // Tables déjà prises
): TableInfo[]

Étapes :

1. INITIALISATION
   result = [clickedTable]
   currentCapacity = clickedTable.capacity
   
2. SI CAPACITÉ SUFFISANTE
   return result  // Table unique suffit
   
3. SI NON COMBINABLE
   direction = clickedTable.combinationDirection
   if (direction === "none") return result
   
4. FILTRER CANDIDATS
   candidates = allTables.filter(t =>
     t._id !== clickedTable._id &&
     !alreadyAssignedIds.has(t._id)
   )
   
5. CALCULER DISTANCES
   Pour chaque candidat:
     if (direction === "horizontal")
       distance = |ΔY| × 100 + |ΔX|  // Priorité même ligne
     else
       distance = |ΔX| × 100 + |ΔY|  // Priorité même colonne
   
6. TRIER PAR PROXIMITÉ
   candidates.sort(by distance ascending)
   
7. CONSTRUIRE CHAÎNE
   Pour chaque candidat (par proximité):
     if (currentCapacity >= neededCapacity) break
     result.push(candidat)
     currentCapacity += candidat.capacity
   
8. RETOURNER RÉSULTAT
   return result  // [T1, T2, T3, ...]

Backend (findCombinableTables)
Version serveur avec vérifications supplémentaires :

async function findCombinableTables(
  ctx: QueryCtx,
  startTable: Doc<"tables">,
  requiredCapacity: number,
  date: string,
  service: "midi" | "soir"
): Promise<Id<"tables">[]>

Vérifications additionnelles :

Query des tables occupées pour ce service
Validation adjacence stricte (ΔPos === 1)
Gestion des erreurs si capacité impossible
5.4 Validation des combinaisons
function isValidTableCombination(
  tables: Doc<"tables">[],
  tableIds: Id<"tables">[]
): boolean {
  // Table unique → toujours valide
  if (tableIds.length <= 1) return true;
  
  // Toutes dans la même zone
  const zones = new Set(tables.map(t => t.zone));
  if (zones.size > 1) return false;
  
  // Toutes actives
  if (tables.some(t => !t.isActive)) return false;
  
  return true;
}

5.5 Détection de "gaps" (trous)
function hasGap(tables: Table[], direction: "vertical" | "horizontal"): boolean {
  for (let i = 1; i < tables.length; i++) {
    const prev = tables[i - 1];
    const curr = tables[i];
    
    if (direction === "vertical") {
      if (Math.abs(curr.positionY - prev.positionY) !== 1) return true;
    } else {
      if (Math.abs(curr.positionX - prev.positionX) !== 1) return true;
    }
  }
  return false;
}

6. Intégration avec la page Réservations
6.1 Affichage de la table master uniquement
Règle importante : Sur la liste des réservations, seule la première table (master) est affichée, même si plusieurs tables sont assignées.

Logique d'affichage
// Données stockées
reservation.tableIds = ["T1", "T2", "T3"];  // 3 tables combinées

// Affichage dans la liste
displayedTable = reservation.tableIds[0];  // "T1" uniquement

// Ou si aucune table
displayedTable = reservation.tableIds.length > 0 ? reservation.tableIds[0] : "—";

Rendu visuel
<div className="table-cell">
  {reservation.tableIds && reservation.tableIds.length > 0 ? (
    <span className="font-mono bg-gray-100 px-2.5 py-1 rounded">
      {reservation.tableIds[0]}  {/* Affiche uniquement T1 */}
    </span>
  ) : (
    <span className="text-gray-500">—</span>
  )}
</div>

6.2 Flow d'assignation Click-Click
┌─────────────────────────────────────────────────────────────────┐
│  LISTE RÉSERVATIONS                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ▌19:30  │ [—]  │ 6p │ Dupont Jean │ [Arrivé] [✗]              │
│           ↑                                                      │
│           │ Clic                                                 │
│           ▼                                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Toast: "Cliquez sur une table pour Dupont (6 pers.)"      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────┐                                │
│  │     PLAN DE SALLE           │                                │
│  │                             │                                │
│  │  [T1]──[T2]──[T3]  ← Clic  │                                │
│  │   2p    2p    2p    sur T1  │                                │
│  │                             │                                │
│  │  Algorithme:                │                                │
│  │  6 pers. > 2 places         │                                │
│  │  → Auto-select T1+T2+T3     │                                │
│  └─────────────────────────────┘                                │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Toast: "Dupont → Table T1" (affiche master uniquement)    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Résultat:                                                       │
│  • BDD: tableIds = ["T1", "T2", "T3"]                           │
│  • Affichage liste: "T1"                                         │
│                                                                  │
│  ▌19:30  │ [T1] │ 6p │ Dupont Jean │ [Arrivé] [✗]              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

6.3 Contexte d'assignation (TableAssignmentContext)
État
interface TableAssignmentContextValue {
  pendingAssignment: PendingAssignment | null;
  startAssignment: (reservation: PendingAssignment) => void;
  cancelAssignment: () => void;
  assignTable: (clickedTable: TableInfo, allTables: TableInfo[]) => Promise<void>;
  isAssigning: boolean;
  assignedTablesMap: Map<string | number, string[]>;
  isTableAssigned: (tableId: string) => boolean;
}

interface PendingAssignment {
  reservationId?: Id<"reservations">;
  localId?: number;
  reservationName: string;
  partySize: number;
  onAssign?: (tableNames: string[], tableIds: string[]) => void;
}

Flow
1. startAssignment(reservation)
   → setPendingAssignment(reservation)
   → Toast "Cliquez sur une table..."

2. Utilisateur clique sur table T1

3. assignTable(T1, allTables)
   → findAdjacentTables(T1, allTables, partySize, alreadyAssigned)
   → tablesToAssign = [T1, T2, T3]
   
4. Mode local (test data):
   → onAssign(["T1", "T2", "T3"], [id1, id2, id3])
   
   Mode Convex (prod):
   → assignTablesMutation({ reservationId, tableIds })

5. Toast confirmation
   → "Dupont → Table T1"  // Affiche uniquement master

6. setPendingAssignment(null)

6.4 Indicateurs visuels sur le plan
Mode normal (sans assignation en cours)
Élément	Style
Table libre	Zone color normal
Table assignée	bg-violet-200 border-violet-500
Mode assignation active
Élément	Style
Bandeau info	bg-blue-600 text-white animate-pulse
Grille	border-blue-400 ring-2 ring-blue-200
Tables hover	hover:scale-110 hover:shadow-xl hover:ring-2 hover:ring-blue-400
Table réservation en cours	bg-blue-100 border-blue-400 ring-2 ring-blue-300
7. Algorithmes
7.1 Algorithme principal : Auto-sélection multi-tables
ENTRÉE:
  - clickedTable: Table sélectionnée par l'utilisateur
  - allTables: Toutes les tables du plan
  - partySize: Nombre de personnes à placer
  - occupiedIds: Tables déjà prises ce service

SORTIE:
  - tableIds[]: Liste des tables à assigner

ALGORITHME:

1. INIT
   chain = [clickedTable]
   capacity = clickedTable.capacity
   direction = clickedTable.combinationDirection

2. CHECK SUFFISANT
   IF capacity >= partySize:
     RETURN chain

3. CHECK COMBINABLE
   IF direction === "none":
     RETURN chain  // Capacité insuffisante mais non combinable

4. FIND CANDIDATES
   candidates = allTables
     .filter(NOT in chain)
     .filter(NOT in occupiedIds)
     .filter(isActive)
     .filter(SAME direction)
     .filter(SAME axis based on direction)

5. SORT BY PROXIMITY
   IF direction === "horizontal":
     SORT BY (|ΔY| * 100 + |ΔX|)  // Priorité même ligne
   ELSE:
     SORT BY (|ΔX| * 100 + |ΔY|)  // Priorité même colonne

6. BUILD CHAIN
   lastAdded = clickedTable
   FOR EACH candidate IN sorted_candidates:
     IF capacity >= partySize:
       BREAK
     IF isAdjacent(lastAdded, candidate, direction):
       chain.ADD(candidate)
       capacity += candidate.capacity
       lastAdded = candidate

7. RETURN chain

7.2 Test d'adjacence
FONCTION isAdjacent(table1, table2, direction):

  IF direction === "vertical":
    RETURN table1.positionX === table2.positionX
       AND |table1.positionY - table2.positionY| === 1
  
  ELSE IF direction === "horizontal":
    RETURN table1.positionY === table2.positionY
       AND |table1.positionX - table2.positionX| === 1
  
  RETURN false

7.3 Génération des slots (Scoring ML)
FONCTION buildSlots(tables, minCapacity):
  slots = []
  
  // 1. Tables individuelles
  FOR EACH table IN tables:
    IF table.capacity >= minCapacity:
      slots.ADD({
        tableIds: [table._id],
        capacity: table.capacity,
        direction: "none"
      })
  
  // 2. Combinaisons verticales
  verticalGroups = GROUP tables BY positionX WHERE direction === "vertical"
  FOR EACH group IN verticalGroups:
    SORT group BY positionY
    FOR i = 0 TO group.length:
      FOR j = i+1 TO group.length:
        chain = group[i..j]
        IF NOT hasGap(chain, "vertical"):
          totalCapacity = SUM(chain.capacity)
          IF totalCapacity >= minCapacity:
            slots.ADD({
              tableIds: chain.map(_id),
              capacity: totalCapacity,
              direction: "vertical"
            })
  
  // 3. Combinaisons horizontales (même logique)
  ...
  
  RETURN slots

8. API Backend (Convex)
8.1 Mutations tables
Mutation	Args	Description
tables.create	{name, capacity, zone, positionX, positionY, combinationDirection}	Crée une table
tables.update	{id, ...partialData}	Met à jour une table
tables.deactivate	{id}	Désactive (soft delete)
tables.activate	{id}	Réactive
tables.duplicate	{id}	Clone avec position décalée
tables.activateTerrace	-	Active toutes tables terrasse
tables.deactivateTerrace	-	Désactive toutes tables terrasse
8.2 Mutations réservations
Mutation	Args	Description
reservations.assignTables	{reservationId, tableIds[], reason?}	Assigne tables avec anti-collision
Anti-collision
// Pour chaque table demandée
for (const tableId of args.tableIds) {
  const conflict = serviceReservations.find(
    r => r.tableIds?.includes(tableId)
  );
  
  if (conflict) {
    throw new Error(`${tableName} déjà assignée à ${conflict.lastName}`);
  }
}

8.3 Queries
Query	Args	Description
tables.list	{activeOnly?: boolean}	Liste des tables
tables.stats	-	Statistiques (total, par zone, capacité)
tables.getTableStates	{date, service}	États temps réel
9. Composants UI
9.1 Arborescence
src/components/admin/floor-plan/
├── index.ts                    # Exports
├── useFloorPlan.ts             # Hook état global
├── FloorPlanView.tsx           # Composant principal
├── FloorPlanProvider.tsx       # Context + DnD
├── FloorPlanGrid.tsx           # Grille SVG + tables
├── FloorPlanTable.tsx          # Table draggable
├── FloorPlanTableGhost.tsx     # Ghost pendant drag
├── FloorPlanDropIndicator.tsx  # Indicateur de drop
├── FloorPlanCombinationLines.tsx # Lignes de connexion
├── FloorPlanStats.tsx          # Barre de stats
├── FloorPlanHeaderActions.tsx  # Actions header
├── TableEditPanel.tsx          # Panneau édition
└── TableModal.tsx              # Modal création

9.2 Composants clés
FloorPlanTable
<div
  className={cn(
    "absolute flex flex-col items-center justify-center rounded-lg border-2",
    zoneStyle.bg,
    zoneStyle.border,
    !table.isActive && "opacity-40 grayscale",
    isDragging && "opacity-50 border-dashed",
    isEditMode && "cursor-grab hover:scale-[1.02]"
  )}
  style={{
    left: table.positionX * GRID_CELL_SIZE + 2,
    top: table.positionY * GRID_CELL_SIZE + 2,
    width: gridWidth * TABLE_SIZE - 4,
    height: gridHeight * TABLE_SIZE - 4,
  }}
>
  {/* Grip handle */}
  {isEditMode && <GripVertical />}
  
  {/* Nom */}
  <span className="text-xs font-semibold">{table.name}</span>
  
  {/* Capacité */}
  <span className="text-[10px]">{table.capacity} <Users /></span>
  
  {/* Badge dimensions si > 1×1 */}
  {(width > 1 || height > 1) && (
    <span className="badge">{width}×{height}</span>
  )}
</div>

FloorPlanCombinationLines
<svg width={GRID_WIDTH} height={GRID_HEIGHT}>
  {lines.map(line => (
    <line
      key={line.key}
      x1={line.x1} y1={line.y1}
      x2={line.x2} y2={line.y2}
      stroke={line.color}  // Bleu vertical, Violet horizontal
      strokeWidth={3}
      strokeDasharray="6 4"
      opacity={0.5}
    />
  ))}
</svg>

10. Constantes et configuration
10.1 Grille (lib/constants/grid.ts)
export const GRID_CELL_SIZE = 16;    // px
export const TABLE_SIZE = 48;         // px
export const TABLE_GRID_SPAN = 3;     // cellules
export const GRID_COLS = 48;
export const GRID_ROWS = 40;
export const GRID_WIDTH = 768;        // px
export const GRID_HEIGHT = 640;       // px

export const Z_INDEX = {
  grid: 1,
  table: 10,
  tableSelected: 20,
  dropIndicator: 30,
  combinationHint: 40,
  ghost: 50,
  modal: 100,
};

export const ZONE_STYLES = {
  salle: { bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-800" },
  interieur: { bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-800" },
  terrasse: { bg: "bg-emerald-100", border: "border-emerald-400", text: "text-emerald-800" },
};

10.2 Types (lib/types/tables.ts)
export type Zone = "interieur" | "salle" | "terrasse";
export type CombinationDirection = "vertical" | "horizontal" | "none";
export type TableStatus = "free" | "reserved" | "seated";

export interface Table {
  _id: Id<"tables">;
  name: string;
  capacity: number;
  zone: Zone;
  positionX: number;
  positionY: number;
  combinationDirection?: CombinationDirection;
  width?: number;
  height?: number;
  isActive: boolean;
  // ...
}

export function getTableDimensions(table: Pick<Table, "width" | "height">) {
  return {
    width: table.width ?? 1,
    height: table.height ?? 1,
  };
}

11. Fichiers sources
11.1 Frontend
Fichier	Rôle
src/app/admin/parametres/tables/page.tsx	Page configuration
src/components/admin/floor-plan/FloorPlanView.tsx	Composant principal
src/components/admin/floor-plan/FloorPlanProvider.tsx	Context + DnD
src/components/admin/floor-plan/FloorPlanGrid.tsx	Grille SVG
src/components/admin/floor-plan/FloorPlanTable.tsx	Table draggable
src/components/admin/floor-plan/FloorPlanTableGhost.tsx	Ghost drag
src/components/admin/floor-plan/FloorPlanDropIndicator.tsx	Indicateur drop
src/components/admin/floor-plan/FloorPlanCombinationLines.tsx	Lignes connexion
src/components/admin/floor-plan/FloorPlanStats.tsx	Stats bar
src/components/admin/floor-plan/FloorPlanHeaderActions.tsx	Header actions
src/components/admin/floor-plan/TableEditPanel.tsx	Panneau édition
src/components/admin/floor-plan/TableModal.tsx	Modal création
src/components/admin/floor-plan/useFloorPlan.ts	Hook global
src/components/admin/restobook/TableAssignmentContext.tsx	Context assignation
src/lib/constants/grid.ts	Constantes grille
src/lib/types/tables.ts	Types TypeScript
11.2 Backend (Convex)
Fichier	Rôle
convex/schema.ts	Schéma BDD (tables, reservations)
convex/tables.ts	CRUD tables
convex/reservations.ts	Mutation assignTables
convex/tableAssignment.ts	Logique assignation avancée
convex/lib/tableAvailability.ts	Helpers disponibilité
convex/utils/tableGrouping.ts	Algorithmes chaîne/adjacence
convex/scoring.ts	Génération slots, scoring ML
Annexe : Exemples concrets
A. Création d'une table combinable
// Création via modal
await createTable({
  name: "T1",
  capacity: 2,
  zone: "salle",
  positionX: 10,
  positionY: 5,
  combinationDirection: "horizontal",  // Combinable gauche-droite
});

B. Assignation multi-tables automatique
// Groupe de 6 personnes, clique sur T1 (2 places, horizontal)
const result = findAdjacentTables(
  { _id: "T1", capacity: 2, positionX: 10, positionY: 5, combinationDirection: "horizontal" },
  allTables,  // Contient T2 (X:13, Y:5, 2p) et T3 (X:16, Y:5, 2p)
  6,          // partySize
  new Set()   // occupiedIds
);

// Résultat: [T1, T2, T3] = 6 places

C. Affichage dans la liste des réservations
// Données BDD
const reservation = {
  tableIds: ["T1", "T2", "T3"],
  partySize: 6,
  lastName: "Dupont"
};

// Affichage (table master uniquement)
<span className="table-badge">
  {reservation.tableIds[0]}  {/* Affiche "T1" */}
</span>

Ce PRD fournit toutes les spécifications nécessaires pour reproduire le système complet de configuration du plan de salle et de combinaison automatique des tables.

