/* ==========================================================================
   Textes du site en 6 langues (fr, nl, en, de, it, es).
   Le français fait foi ; le HTML contient aussi le français pour le
   référencement et l'affichage sans JavaScript.
   ========================================================================== */
var I18N = {
  "skip": t6("Aller au contenu", "Naar de inhoud", "Skip to content", "Zum Inhalt", "Vai al contenuto", "Ir al contenido"),

  "nav.label": t6("Navigation principale", "Hoofdnavigatie", "Main navigation", "Hauptnavigation", "Navigazione principale", "Navegación principal"),
  "nav.carte": t6("La carte", "De kaart", "Menu", "Speisekarte", "Il menu", "La carta"),
  "nav.maison": t6("La maison", "Het huis", "Our story", "Das Haus", "La casa", "La casa"),
  "nav.service": t6("Le service", "De service", "Service", "Service", "Il servizio", "El servicio"),
  "nav.infos": t6("Infos", "Info", "Visit", "Infos", "Info", "Info"),
  "nav.langLabel": t6("Choisir la langue", "Kies uw taal", "Choose language", "Sprache wählen", "Scegli la lingua", "Elegir idioma"),
  "nav.open": t6("Ouvrir le menu", "Menu openen", "Open menu", "Menü öffnen", "Apri il menu", "Abrir el menú"),
  "nav.close": t6("Fermer le menu", "Menu sluiten", "Close menu", "Menü schließen", "Chiudi il menu", "Cerrar el menú"),

  "cta.book": t6("Réserver une table", "Reserveer een tafel", "Book a table", "Tisch reservieren", "Prenota un tavolo", "Reservar mesa"),

  "hero.eyebrow": t6("Ostende · depuis 2011", "Oostende · sinds 2011", "Ostend · since 2011", "Ostende · seit 2011", "Ostenda · dal 2011", "Ostende · desde 2011"),
  "hero.title": t6(
    "Quarante façons d'<em>aimer</em> la moule.",
    "Veertig manieren om van mosselen te <em>houden.</em>",
    "Forty ways to <em>love</em> mussels.",
    "Vierzig Arten, Muscheln zu <em>lieben.</em>",
    "Quaranta modi di <em>amare</em> le cozze.",
    "Cuarenta maneras de <em>amar</em> los mejillones."
  ),
  "hero.lead": t6(
    "Moules fraîches de Zélande, cuisinées sous vos yeux par Benjamin et servies par Allisson, face au port d'Ostende.",
    "Verse Zeeuwse mosselen, voor uw ogen bereid door Benjamin en geserveerd door Allisson, met zicht op de haven van Oostende.",
    "Fresh Zeeland mussels, cooked before your eyes by Benjamin and served by Allisson, facing Ostend harbour.",
    "Frische Zeeland-Muscheln, vor Ihren Augen von Benjamin gekocht und von Allisson serviert, direkt am Hafen von Ostende.",
    "Cozze fresche della Zelanda, cucinate sotto i vostri occhi da Benjamin e servite da Allisson, sul porto di Ostenda.",
    "Mejillones frescos de Zelanda, cocinados ante sus ojos por Benjamin y servidos por Allisson, frente al puerto de Ostende."
  ),
  "hero.menuLink": t6("Découvrir la carte", "Ontdek de kaart", "Explore the menu", "Zur Speisekarte", "Scopri il menu", "Descubrir la carta"),
  "hero.imgAlt": t6("Une grande casserole de moules posée sur la table", "Een grote pot mosselen op tafel", "A large pot of mussels on the table", "Ein großer Topf Muscheln auf dem Tisch", "Una grande pentola di cozze in tavola", "Una gran cazuela de mejillones sobre la mesa"),

  "manifesto.label": t6("Notre promesse", "Onze belofte", "Our promise", "Unser Versprechen", "La nostra promessa", "Nuestra promesa"),
  "manifesto.text": t6(
    "Chez nous, la moule reste ce qu'elle a toujours été : généreuse, simple, à partager. Tout le reste, l'accueil, la table, le geste, nous le soignons comme une grande maison.",
    "Bij ons blijft de mossel wat ze altijd was: royaal, eenvoudig, om te delen. Al de rest, het onthaal, de tafel, elk gebaar, verzorgen we als een groot huis.",
    "Here, mussels stay what they have always been: generous, simple, made for sharing. Everything else, the welcome, the table, every gesture, we look after like a grand house.",
    "Bei uns bleibt die Muschel, was sie immer war: großzügig, einfach, zum Teilen. Alles andere, der Empfang, der Tisch, jede Geste, pflegen wir wie ein großes Haus.",
    "Da noi la cozza resta ciò che è sempre stata: generosa, semplice, da condividere. Tutto il resto, l'accoglienza, la tavola, ogni gesto, lo curiamo come una grande casa.",
    "Aquí el mejillón sigue siendo lo que siempre fue: generoso, sencillo, para compartir. Todo lo demás, la acogida, la mesa, cada gesto, lo cuidamos como una gran casa."
  ),

  "carte.imgAlt": t6("Moules fraîches de Zélande, coquilles bleu-noir", "Verse Zeeuwse mosselen, blauwzwarte schelpen", "Fresh Zeeland mussels, blue-black shells", "Frische Zeeland-Muscheln, blauschwarze Schalen", "Cozze fresche della Zelanda, gusci blu-neri", "Mejillones frescos de Zelanda, conchas azul-negro"),
  "carte.familiesLabel": t6("Familles de préparations", "Soorten bereidingen", "Families of preparations", "Zubereitungsarten", "Famiglie di preparazioni", "Familias de preparaciones"),
  "carte.all": t6("Toutes", "Alle", "All", "Alle", "Tutte", "Todas"),
  "carte.surprise": t6("Surprenez-moi", "Verras me", "Surprise me", "Überrasch mich", "Sorprendimi", "Sorpréndeme"),
  "carte.want": t6("J'ai envie de…", "Ik heb zin in…", "I feel like…", "Ich hätte Lust auf…", "Ho voglia di…", "Me apetece…"),
  "carte.count": t6("{n} préparations", "{n} bereidingen", "{n} preparations", "{n} Zubereitungen", "{n} preparazioni", "{n} preparaciones"),
  "carte.count1": t6("1 préparation", "1 bereiding", "1 preparation", "1 Zubereitung", "1 preparazione", "1 preparación"),
  "carte.empty": t6(
    "Aucune préparation ne réunit tous ces ingrédients. Retirez un filtre, ou composez la vôtre.",
    "Geen enkele bereiding combineert al deze ingrediënten. Verwijder een filter of stel uw eigen samen.",
    "No preparation combines all of these. Remove a filter, or build your own.",
    "Keine Zubereitung vereint all diese Zutaten. Entfernen Sie einen Filter oder stellen Sie Ihre eigene zusammen.",
    "Nessuna preparazione riunisce tutti questi ingredienti. Togli un filtro, o componi la tua.",
    "Ninguna preparación reúne todos estos ingredientes. Quite un filtro o cree la suya."
  ),
  "carte.clear": t6("Effacer les filtres", "Filters wissen", "Clear filters", "Filter löschen", "Cancella i filtri", "Borrar filtros"),
  "carte.full": t6("Carte complète et boissons", "Volledige kaart en dranken", "Full menu and drinks", "Ganze Karte und Getränke", "Menu completo e bevande", "Carta completa y bebidas"),
  "carte.allergens": t6(
    "Allergènes : la liste détaillée est disponible sur place, via le QR code de notre carte.",
    "Allergenen: de volledige lijst vindt u ter plaatse via de QR-code op onze kaart.",
    "Allergens: the full list is available on site, via the QR code on our menu.",
    "Allergene: Die vollständige Liste finden Sie vor Ort über den QR-Code auf unserer Karte.",
    "Allergeni: l'elenco completo è disponibile sul posto, tramite il codice QR del nostro menu.",
    "Alérgenos: la lista completa está disponible en el local, con el código QR de nuestra carta."
  ),

  "f.ail": t6("Ail", "Look", "Garlic", "Knoblauch", "Aglio", "Ajo"),
  "f.creme": t6("Crème", "Room", "Cream", "Sahne", "Panna", "Nata"),
  "f.vin": t6("Vin", "Wijn", "Wine", "Wein", "Vino", "Vino"),
  "f.curry": t6("Curry", "Kerrie", "Curry", "Curry", "Curry", "Curry"),
  "f.tomate": t6("Tomate", "Tomaat", "Tomato", "Tomate", "Pomodoro", "Tomate"),
  "f.epice": t6("Relevé", "Pikant", "Spicy", "Scharf", "Piccante", "Picante"),
  "f.fromage": t6("Fromage", "Kaas", "Cheese", "Käse", "Formaggio", "Queso"),
  "f.herbes": t6("Herbes", "Kruiden", "Herbs", "Kräuter", "Erbe", "Hierbas"),
  "f.champignons": t6("Champignons", "Champignons", "Mushrooms", "Champignons", "Funghi", "Champiñones"),
  "f.mer": t6("Saveurs de la mer", "Zeesmaken", "Seafood flavours", "Meeresaromen", "Sapori di mare", "Sabores de mar"),
  "f.sanscreme": t6("Sans crème", "Zonder room", "No cream", "Ohne Sahne", "Senza panna", "Sin nata"),

  "cas.label": t6("Votre casserole", "Uw pot", "Your pot", "Ihr Topf", "La vostra pentola", "Su cazuela"),
  "cas.empty": t6(
    "Choisissez une préparation dans la liste : nous composons votre casserole, prix compris.",
    "Kies een bereiding in de lijst: wij stellen uw pot samen, prijs inbegrepen.",
    "Pick a preparation from the list and we'll build your pot, price included.",
    "Wählen Sie eine Zubereitung aus der Liste: Wir stellen Ihren Topf zusammen, mit Preis.",
    "Scegli una preparazione dall'elenco: componiamo la vostra pentola, prezzo incluso.",
    "Elija una preparación de la lista: componemos su cazuela, precio incluido."
  ),
  "cas.light": t6("Version légère, sans crème", "Lichte versie, zonder room", "Light version, no cream", "Leichte Variante, ohne Sahne", "Versione leggera, senza panna", "Versión ligera, sin nata"),
  "cas.lightLine": t6("Version légère", "Lichte versie", "Light version", "Leichte Variante", "Versione leggera", "Versión ligera"),
  "cas.included": t6("sans supplément", "zonder meerprijs", "no extra charge", "ohne Aufpreis", "senza supplemento", "sin suplemento"),
  "cas.custom": t6("Ajouter un ingrédient", "Ingrediënt toevoegen", "Add an ingredient", "Zutat hinzufügen", "Aggiungi un ingrediente", "Añadir un ingrediente"),
  "cas.supplement": t6("Supplément", "Supplement", "Supplement", "Aufpreis", "Supplemento", "Suplemento"),
  "cas.total": t6("Total", "Totaal", "Total", "Gesamt", "Totale", "Total"),
  "cas.pairing": t6("Accord suggéré", "Aanbevolen wijn", "Suggested pairing", "Weinempfehlung", "Abbinamento consigliato", "Maridaje sugerido"),
  "cas.bottle": t6("la bouteille", "per fles", "per bottle", "die Flasche", "la bottiglia", "la botella"),
  "cas.formula": t6("À deux ? {name} : {price}", "Met twee? {name}: {price}", "For two? {name}: {price}", "Zu zweit? {name}: {price}", "In due? {name}: {price}", "¿Para dos? {name}: {price}"),
  "cas.fries": t6(
    "Frites en supplément : petite {s}, grande {l}.",
    "Frietjes apart: klein {s}, groot {l}.",
    "Fries on the side: small {s}, large {l}.",
    "Pommes extra: klein {s}, groß {l}.",
    "Patatine a parte: piccola {s}, grande {l}.",
    "Patatas aparte: pequeña {s}, grande {l}."
  ),

  "common.close": t6("Fermer", "Sluiten", "Close", "Schließen", "Chiudi", "Cerrar"),

  "more.title": t6("Pour tous les <em>appétits.</em>", "Voor ieders <em>goesting.</em>", "For every <em>appetite.</em>", "Für jeden <em>Appetit.</em>", "Per tutti gli <em>appetiti.</em>", "Para todos los <em>apetitos.</em>"),
  "more.duo": t6("À deux", "Met twee", "For two", "Zu zweit", "In due", "Para dos"),
  "more.duoLead": t6(
    "Deux moules au choix et une bouteille à partager.",
    "Twee mosselpotten naar keuze en een fles om te delen.",
    "Two pots of mussels of your choice and a bottle to share.",
    "Zwei Muscheltöpfe nach Wahl und eine Flasche zum Teilen.",
    "Due pentole di cozze a scelta e una bottiglia da condividere.",
    "Dos cazuelas de mejillones a elegir y una botella para compartir."
  ),
  "more.duoAlt": t6("Verres de vin blanc sur une table dressée", "Glazen witte wijn op een gedekte tafel", "Glasses of white wine on a laid table", "Weißweingläser auf einem gedeckten Tisch", "Calici di vino bianco su una tavola apparecchiata", "Copas de vino blanco en una mesa puesta"),
  "more.noMussels": t6("Pas envie de moules ?", "Geen zin in mosselen?", "Not in the mood for mussels?", "Keine Lust auf Muscheln?", "Niente cozze oggi?", "¿No le apetecen mejillones?"),

  "maison.imgA": t6("La salle dressée pour le service du soir", "De zaal, gedekt voor de avond", "The dining room set for dinner service", "Der Speisesaal, für den Abend eingedeckt", "La sala apparecchiata per la cena", "La sala preparada para la cena"),
  "maison.imgB": t6("Un verre de vin sur une table du restaurant", "Een glas wijn op een tafel in het restaurant", "A glass of wine on a restaurant table", "Ein Glas Wein auf einem Tisch im Restaurant", "Un calice di vino su un tavolo del ristorante", "Una copa de vino en una mesa del restaurante"),
  "maison.title": t6("Allisson reçoit.<br><em>Benjamin cuisine.</em>", "Allisson ontvangt.<br><em>Benjamin kookt.</em>", "Allisson welcomes.<br><em>Benjamin cooks.</em>", "Allisson empfängt.<br><em>Benjamin kocht.</em>", "Allisson accoglie.<br><em>Benjamin cucina.</em>", "Allisson recibe.<br><em>Benjamin cocina.</em>"),
  "maison.text": t6(
    "En 2011, au sortir de ses études, Allisson a un coup de cœur pour ce restaurant du Visserskaai. Depuis, elle vous accueille en salle pendant que Benjamin cuisine chaque casserole à la minute, en cuisine ouverte.",
    "In 2011, net afgestudeerd, wordt Allisson verliefd op dit restaurant aan de Visserskaai. Sindsdien ontvangt zij u in de zaal, terwijl Benjamin elke pot à la minute bereidt in de open keuken.",
    "In 2011, just out of university, Allisson fell for this restaurant on the Visserskaai. Since then she has welcomed you in the dining room while Benjamin cooks every pot to order in the open kitchen.",
    "2011, gleich nach dem Studium, verliebt sich Allisson in dieses Restaurant am Visserskaai. Seitdem empfängt sie Sie im Saal, während Benjamin jeden Topf frisch in der offenen Küche zubereitet.",
    "Nel 2011, appena finiti gli studi, Allisson si innamora di questo ristorante sul Visserskaai. Da allora vi accoglie in sala mentre Benjamin cucina ogni pentola al momento, nella cucina a vista.",
    "En 2011, recién terminados sus estudios, Allisson se enamora de este restaurante del Visserskaai. Desde entonces le recibe en la sala mientras Benjamin cocina cada cazuela al momento, en la cocina abierta."
  ),
  "maison.text2": t6(
    "Une maison à deux, où l'on vient pour les moules et où l'on revient pour l'accueil.",
    "Een zaak met z'n tweeën, waar u komt voor de mosselen en terugkomt voor het onthaal.",
    "A house run by two, where people come for the mussels and come back for the welcome.",
    "Ein Haus zu zweit: Man kommt wegen der Muscheln und kommt wieder wegen des Empfangs.",
    "Una casa a due, dove si viene per le cozze e si torna per l'accoglienza.",
    "Una casa de dos, a la que se viene por los mejillones y se vuelve por la acogida."
  ),
  "maison.s1": t6("le coup de cœur", "liefde op het eerste gezicht", "where it began", "der Anfang", "il colpo di fulmine", "el flechazo"),
  "maison.s2": t6("préparations maison", "eigen bereidingen", "homemade preparations", "hausgemachte Zubereitungen", "preparazioni della casa", "preparaciones caseras"),
  "maison.s3": t6("langues à la carte", "talen op de kaart", "languages on the menu", "Sprachen auf der Karte", "lingue nel menu", "idiomas en la carta"),

  "terrasse.imgAlt": t6("Le port de pêche d'Ostende et ses bateaux", "De vissershaven van Oostende en zijn boten", "Ostend's fishing harbour and its boats", "Der Fischereihafen von Ostende mit seinen Booten", "Il porto peschereccio di Ostenda e le sue barche", "El puerto pesquero de Ostende y sus barcos"),
  "terrasse.title": t6("Une terrasse face <em>aux bateaux.</em>", "Een terras met zicht <em>op de boten.</em>", "A terrace facing <em>the boats.</em>", "Eine Terrasse mit Blick <em>auf die Boote.</em>", "Una terrazza di fronte <em>alle barche.</em>", "Una terraza frente <em>a los barcos.</em>"),
  "terrasse.text": t6(
    "Sur le Visserskaai, entre le port de pêche et la mer. Aux beaux jours, on s'installe dehors et on regarde rentrer les bateaux.",
    "Aan de Visserskaai, tussen de vissershaven en de zee. Bij mooi weer schuift u buiten aan en kijkt u hoe de boten binnenvaren.",
    "On the Visserskaai, between the fishing harbour and the sea. On fine days, take a seat outside and watch the boats come in.",
    "Am Visserskaai, zwischen Fischereihafen und Meer. An schönen Tagen sitzt man draußen und sieht die Boote einlaufen.",
    "Sul Visserskaai, tra il porto peschereccio e il mare. Nelle belle giornate ci si siede fuori a guardare le barche rientrare.",
    "En el Visserskaai, entre el puerto pesquero y el mar. Los días buenos, uno se sienta fuera y mira llegar los barcos."
  ),

  "dusk.line": t6("Le soir tombe sur le port.", "De avond valt over de haven.", "Evening falls over the harbour.", "Der Abend senkt sich über den Hafen.", "La sera scende sul porto.", "La tarde cae sobre el puerto."),

  "service.eyebrow": t6("L'art de recevoir", "De kunst van het ontvangen", "The art of hosting", "Die Kunst des Empfangens", "L'arte di accogliere", "El arte de recibir"),
  "service.title": t6(
    "Tout ce qui entoure la moule est <em>pensé pour vous.</em>",
    "Alles rond de mossel is <em>voor u bedacht.</em>",
    "Everything around the mussels is <em>designed for you.</em>",
    "Alles rund um die Muschel ist <em>für Sie gedacht.</em>",
    "Tutto ciò che circonda la cozza è <em>pensato per voi.</em>",
    "Todo lo que rodea al mejillón está <em>pensado para usted.</em>"
  ),
  "service.lead": t6(
    "De la réservation à l'addition, nous avons fait simple là où c'est permis, et soigné partout ailleurs.",
    "Van reservatie tot rekening: eenvoudig waar het kan, verzorgd waar het telt.",
    "From booking to bill: simple wherever possible, polished everywhere else.",
    "Von der Reservierung bis zur Rechnung: einfach, wo es geht, sorgfältig überall sonst.",
    "Dalla prenotazione al conto: semplice dove si può, curato ovunque.",
    "De la reserva a la cuenta: sencillo donde se puede, cuidado en todo lo demás."
  ),
  "s1.t": t6("Votre table, vérifiée à la main", "Uw tafel, persoonlijk nagekeken", "Your table, checked by hand", "Ihr Tisch, persönlich geprüft", "Il vostro tavolo, controllato di persona", "Su mesa, revisada a mano"),
  "s1.d": t6(
    "Dès 5 personnes, Allisson vérifie elle-même le plan de salle avant de confirmer. Pour vous installer confortablement, jamais au hasard.",
    "Vanaf 5 personen controleert Allisson zelf de tafelschikking voor ze bevestigt. Zo zit u comfortabel, nooit toevallig.",
    "From 5 guests, Allisson checks the floor plan herself before confirming. You'll be seated comfortably, never at random.",
    "Ab 5 Personen prüft Allisson den Saalplan selbst, bevor sie bestätigt. Damit Sie bequem sitzen, nie zufällig.",
    "Da 5 persone, Allisson controlla lei stessa la sala prima di confermare. Per farvi sedere comodi, mai a caso.",
    "A partir de 5 personas, Allisson revisa ella misma el plano de la sala antes de confirmar. Para sentarle cómodo, nunca al azar."
  ),
  "s2.t": t6("Une cuisine ouverte", "Een open keuken", "An open kitchen", "Eine offene Küche", "Una cucina a vista", "Una cocina abierta"),
  "s2.d": t6(
    "Benjamin cuisine chaque casserole à la minute, sous vos yeux, dans une cuisine ouverte sur la salle.",
    "Benjamin bereidt elke pot à la minute, voor uw ogen, in een keuken die openstaat naar de zaal.",
    "Benjamin cooks every pot to order, right before your eyes, in a kitchen open to the dining room.",
    "Benjamin kocht jeden Topf frisch vor Ihren Augen, in einer zum Saal offenen Küche.",
    "Benjamin cucina ogni pentola al momento, sotto i vostri occhi, in una cucina aperta sulla sala.",
    "Benjamin cocina cada cazuela al momento, ante sus ojos, en una cocina abierta a la sala."
  ),
  "s3.t": t6("La carte dans votre langue", "De kaart in uw taal", "The menu in your language", "Die Karte in Ihrer Sprache", "Il menu nella vostra lingua", "La carta en su idioma"),
  "s3.d": t6(
    "Français, néerlandais, anglais, allemand, italien ou espagnol : chaque préparation est expliquée, sans malentendu.",
    "Frans, Nederlands, Engels, Duits, Italiaans of Spaans: elke bereiding wordt uitgelegd, zonder misverstand.",
    "French, Dutch, English, German, Italian or Spanish: every preparation is explained, with no misunderstanding.",
    "Französisch, Niederländisch, Englisch, Deutsch, Italienisch oder Spanisch: Jede Zubereitung wird erklärt, ohne Missverständnis.",
    "Francese, olandese, inglese, tedesco, italiano o spagnolo: ogni preparazione è spiegata, senza malintesi.",
    "Francés, neerlandés, inglés, alemán, italiano o español: cada preparación se explica, sin malentendidos."
  ),
  "s4.t": t6("Tout le monde à table", "Iedereen aan tafel", "Everyone at the table", "Alle an einen Tisch", "Tutti a tavola", "Todos a la mesa"),
  "s4.d": t6(
    "Chaise haute pour les petits, accès PMR, et votre chien est le bienvenu. Dites-le-nous en réservant.",
    "Kinderstoel voor de kleinsten, toegankelijk voor rolstoelgebruikers, en uw hond is welkom. Laat het ons weten bij uw reservatie.",
    "High chairs for little ones, step-free access, and your dog is welcome. Just tell us when you book.",
    "Hochstuhl für die Kleinen, barrierefreier Zugang, und Ihr Hund ist willkommen. Sagen Sie es uns bei der Reservierung.",
    "Seggiolone per i più piccoli, accesso per disabili, e il vostro cane è il benvenuto. Ditecelo quando prenotate.",
    "Trona para los más pequeños, acceso adaptado y su perro es bienvenido. Indíquelo al reservar."
  ),
  "s5.t": t6("Une addition sans surprise", "Een rekening zonder verrassingen", "A bill with no surprises", "Eine Rechnung ohne Überraschungen", "Un conto senza sorprese", "Una cuenta sin sorpresas"),
  "s5.d": t6(
    "Payconiq, application bancaire ou espèces. Une addition par table. Nous l'annonçons dès la réservation, pour que la soirée reste légère.",
    "Payconiq, bankapp of cash. Eén rekening per tafel. We melden het al bij de reservatie, zodat de avond zorgeloos blijft.",
    "Payconiq, banking app or cash. One bill per table. We tell you when you book, so the evening stays easy.",
    "Payconiq, Banking-App oder bar. Eine Rechnung pro Tisch. Wir sagen es schon bei der Reservierung, damit der Abend entspannt bleibt.",
    "Payconiq, app bancaria o contanti. Un conto per tavolo. Lo diciamo già alla prenotazione, perché la serata resti leggera.",
    "Payconiq, app bancaria o efectivo. Una cuenta por mesa. Lo indicamos al reservar, para que la velada siga siendo ligera."
  ),

  "avis.title": t6("Ils en parlent mieux que nous", "Zij zeggen het beter dan wij", "They say it better than we do", "Unsere Gäste sagen es besser", "Lo dicono meglio di noi", "Ellos lo dicen mejor que nosotros"),
  "avis.google": t6("avis Google", "Google-recensie", "Google review", "Google-Bewertung", "recensione Google", "reseña de Google"),
  "avis.tripadvisor": t6("Titre d'un avis Tripadvisor", "Titel van een Tripadvisor-recensie", "Tripadvisor review title", "Titel einer Tripadvisor-Bewertung", "Titolo di una recensione Tripadvisor", "Título de una reseña de Tripadvisor"),
  "avis.prev": t6("Avis précédent", "Vorige recensie", "Previous review", "Vorherige Bewertung", "Recensione precedente", "Reseña anterior"),
  "avis.next": t6("Avis suivant", "Volgende recensie", "Next review", "Nächste Bewertung", "Recensione successiva", "Reseña siguiente"),
  "avis.pause": t6("Mettre en pause", "Pauzeren", "Pause", "Pausieren", "Metti in pausa", "Pausar"),
  "avis.play": t6("Reprendre", "Hervatten", "Resume", "Fortsetzen", "Riprendi", "Reanudar"),
  "avis.dot": t6("Avis {n}", "Recensie {n}", "Review {n}", "Bewertung {n}", "Recensione {n}", "Reseña {n}"),

  "infos.title": t6("Infos pratiques", "Praktische info", "Plan your visit", "Praktische Infos", "Info pratiche", "Información práctica"),
  "infos.where": t6("Nous trouver", "Ons vinden", "Find us", "So finden Sie uns", "Dove siamo", "Dónde estamos"),
  "infos.city": t6("Ostende", "Oostende", "Ostend", "Ostende", "Ostenda", "Ostende"),
  "infos.whereNote": t6("Sur le quai, face au port de pêche.", "Op de kaai, met zicht op de vissershaven.", "On the quay, facing the fishing harbour.", "Am Kai, gegenüber dem Fischereihafen.", "Sulla banchina, di fronte al porto peschereccio.", "En el muelle, frente al puerto pesquero."),
  "infos.route": t6("Itinéraire", "Route", "Directions", "Route", "Indicazioni", "Cómo llegar"),
  "infos.hours": t6("Horaires", "Openingsuren", "Opening hours", "Öffnungszeiten", "Orari", "Horario"),
  "infos.hoursLead": t6("Nos jours d'ouverture suivent les saisons.", "Onze openingsdagen volgen de seizoenen.", "Our opening days follow the seasons.", "Unsere Öffnungstage folgen den Jahreszeiten.", "I nostri giorni di apertura seguono le stagioni.", "Nuestros días de apertura siguen las estaciones."),
  "infos.high": t6("Haute saison et vacances scolaires", "Hoogseizoen en schoolvakanties", "High season and school holidays", "Hochsaison und Schulferien", "Alta stagione e vacanze scolastiche", "Temporada alta y vacaciones escolares"),
  "infos.highDays": t6("Tous les jours, midi et soir", "Elke dag, 's middags en 's avonds", "Every day, lunch and dinner", "Täglich, mittags und abends", "Tutti i giorni, pranzo e cena", "Todos los días, mediodía y noche"),
  "infos.std": t6("Saison standard", "Tussenseizoen", "Mid season", "Nebensaison", "Media stagione", "Temporada media"),
  "infos.stdDays": t6("Lundi, mardi, vendredi soir, samedi et dimanche", "Maandag, dinsdag, vrijdagavond, zaterdag en zondag", "Monday, Tuesday, Friday evening, Saturday and Sunday", "Montag, Dienstag, Freitagabend, Samstag und Sonntag", "Lunedì, martedì, venerdì sera, sabato e domenica", "Lunes, martes, viernes noche, sábado y domingo"),
  "infos.low": t6("Saison calme", "Rustig seizoen", "Quiet season", "Ruhige Saison", "Bassa stagione", "Temporada tranquila"),
  "infos.lowDays": t6("Vendredi soir, samedi et dimanche", "Vrijdagavond, zaterdag en zondag", "Friday evening, Saturday and Sunday", "Freitagabend, Samstag und Sonntag", "Venerdì sera, sabato e domenica", "Viernes noche, sábado y domingo"),
  "infos.live": t6("Les disponibilités exactes s'affichent en temps réel dans la réservation.", "De exacte beschikbaarheid ziet u live bij het reserveren.", "Exact availability is shown live when you book.", "Die genaue Verfügbarkeit sehen Sie live bei der Reservierung.", "La disponibilità esatta appare in tempo reale al momento della prenotazione.", "La disponibilidad exacta aparece en tiempo real al reservar."),
  "infos.contact": t6("Nous joindre", "Contact", "Contact", "Kontakt", "Contatti", "Contacto"),
  "infos.groups": t6("Groupe de 16 personnes ou plus ?", "Groep van 16 personen of meer?", "Group of 16 or more?", "Gruppe ab 16 Personen?", "Gruppo di 16 persone o più?", "¿Grupo de 16 personas o más?"),
  "infos.groupLink": t6("Demande de groupe", "Groepsaanvraag", "Group request", "Gruppenanfrage", "Richiesta per gruppi", "Solicitud de grupo"),
  "infos.pay": t6("Sur place", "Ter plaatse", "On site", "Vor Ort", "Sul posto", "En el local"),
  "infos.access": t6("Accès PMR, chaise haute, chiens bienvenus", "Rolstoeltoegankelijk, kinderstoel, honden welkom", "Step-free access, high chairs, dogs welcome", "Barrierefrei, Hochstuhl, Hunde willkommen", "Accesso disabili, seggiolone, cani benvenuti", "Acceso adaptado, trona, perros bienvenidos"),

  "closing.line": t6("Une table vous attend <em>face au port.</em>", "Er wacht een tafel op u, <em>aan de haven.</em>", "A table is waiting for you <em>by the harbour.</em>", "Ein Tisch wartet auf Sie, <em>direkt am Hafen.</em>", "Un tavolo vi aspetta <em>sul porto.</em>", "Una mesa le espera <em>frente al puerto.</em>"),

  "footer.label": t6("Pied de page", "Voettekst", "Footer", "Fußzeile", "Piè di pagina", "Pie de página"),
  "footer.legal": t6("Mentions légales", "Wettelijke vermeldingen", "Legal notice", "Impressum", "Note legali", "Aviso legal"),
  "footer.privacy": t6("Confidentialité", "Privacy", "Privacy", "Datenschutz", "Privacy", "Privacidad"),
  "footer.cookies": same("Cookies"),

  "book.guests": t6("Combien serez-vous ?", "Met hoeveel bent u?", "How many guests?", "Wie viele Personen?", "Quanti sarete?", "¿Cuántos serán?"),
  "book.people": t6("{n} personnes", "{n} personen", "{n} guests", "{n} Personen", "{n} persone", "{n} personas"),
  "book.person": t6("1 personne", "1 persoon", "1 guest", "1 Person", "1 persona", "1 persona"),
  "book.minus": t6("Une personne de moins", "Eén persoon minder", "One guest fewer", "Eine Person weniger", "Una persona in meno", "Una persona menos"),
  "book.plus": t6("Une personne de plus", "Eén persoon meer", "One more guest", "Eine Person mehr", "Una persona in più", "Una persona más"),
  "book.bigTable": t6(
    "À partir de 5 personnes, Allisson confirme personnellement votre table par e-mail.",
    "Vanaf 5 personen bevestigt Allisson uw tafel persoonlijk per e-mail.",
    "For 5 guests or more, Allisson confirms your table personally by email.",
    "Ab 5 Personen bestätigt Allisson Ihren Tisch persönlich per E-Mail.",
    "Da 5 persone, Allisson conferma personalmente il vostro tavolo via e-mail.",
    "A partir de 5 personas, Allisson confirma personalmente su mesa por correo electrónico."
  ),
  "book.group": t6("Pour 16 personnes ou plus, faites une demande de groupe.", "Voor 16 personen of meer dient u een groepsaanvraag in.", "For 16 guests or more, please send a group request.", "Für 16 Personen oder mehr stellen Sie bitte eine Gruppenanfrage.", "Per 16 persone o più, inviate una richiesta per gruppi.", "Para 16 personas o más, envíe una solicitud de grupo."),
  "book.date": t6("Quel jour ?", "Welke dag?", "Which day?", "An welchem Tag?", "Quale giorno?", "¿Qué día?"),
  "book.today": t6("Aujourd'hui", "Vandaag", "Today", "Heute", "Oggi", "Hoy"),
  "book.tomorrow": t6("Demain", "Morgen", "Tomorrow", "Morgen", "Domani", "Mañana"),
  "book.closed": t6("Fermé", "Gesloten", "Closed", "Geschlossen", "Chiuso", "Cerrado"),
  "book.service": t6("Midi ou soir ?", "Middag of avond?", "Lunch or dinner?", "Mittag oder Abend?", "Pranzo o cena?", "¿Mediodía o noche?"),
  "book.lunch": t6("Midi", "Middag", "Lunch", "Mittag", "Pranzo", "Mediodía"),
  "book.dinner": t6("Soir", "Avond", "Dinner", "Abend", "Cena", "Noche"),
  "book.time": t6("À quelle heure ?", "Hoe laat?", "What time?", "Um wie viel Uhr?", "A che ora?", "¿A qué hora?"),
  "book.pickFirst": t6("Choisissez d'abord un jour et un service.", "Kies eerst een dag en een moment.", "Pick a day and a service first.", "Wählen Sie zuerst Tag und Service.", "Scegli prima un giorno e un servizio.", "Elija primero un día y un servicio."),
  "book.noSlot": t6("Plus de créneau disponible pour ce service.", "Geen vrij tijdslot meer voor dit moment.", "No more slots left for this service.", "Für diesen Service ist kein Termin mehr frei.", "Nessun orario disponibile per questo servizio.", "No quedan horarios para este servicio."),
  "book.summaryEmpty": t6("Choisissez un jour, un service et une heure.", "Kies een dag, een moment en een uur.", "Choose a day, a service and a time.", "Wählen Sie Tag, Service und Uhrzeit.", "Scegli giorno, servizio e ora.", "Elija día, servicio y hora."),
  "book.at": t6("{date} à {time}", "{date} om {time}", "{date} at {time}", "{date} um {time}", "{date} alle {time}", "{date} a las {time}"),
  "book.continue": t6("Continuer", "Verder", "Continue", "Weiter", "Continua", "Continuar"),
  "book.almost": t6(
    "Il ne reste qu'à confirmer vos coordonnées dans notre module de réservation sécurisé.",
    "U hoeft enkel nog uw gegevens te bevestigen in onze beveiligde reservatiemodule.",
    "All that's left is to confirm your details in our secure booking module.",
    "Jetzt nur noch Ihre Daten in unserem sicheren Reservierungsmodul bestätigen.",
    "Resta solo da confermare i vostri dati nel nostro modulo di prenotazione sicuro.",
    "Solo queda confirmar sus datos en nuestro módulo de reserva seguro."
  ),
  "book.finalize": t6("Finaliser la réservation", "Reservatie afronden", "Complete booking", "Reservierung abschließen", "Completa la prenotazione", "Finalizar la reserva"),
  "book.back": t6("Modifier", "Wijzigen", "Change", "Ändern", "Modifica", "Modificar"),
  "book.pay": t6("Sur place : Payconiq, application bancaire ou espèces.", "Ter plaatse: Payconiq, bankapp of cash.", "On site: Payconiq, banking app or cash.", "Vor Ort: Payconiq, Banking-App oder bar.", "Sul posto: Payconiq, app bancaria o contanti.", "En el local: Payconiq, app bancaria o efectivo."),
  "book.call": t6("Vous préférez appeler ?", "Liever bellen?", "Rather call?", "Lieber anrufen?", "Preferite chiamare?", "¿Prefiere llamar?"),

  "full.title": t6("La carte", "De kaart", "The menu", "Die Speisekarte", "Il menu", "La carta"),
  "full.print": t6("Imprimer", "Afdrukken", "Print", "Drucken", "Stampa", "Imprimir"),

  "toast.soon": t6("Page à venir dans le site final.", "Pagina volgt in de definitieve site.", "Page coming in the final site.", "Seite folgt in der finalen Website.", "Pagina in arrivo nel sito definitivo.", "Página disponible en el sitio final.")
};
