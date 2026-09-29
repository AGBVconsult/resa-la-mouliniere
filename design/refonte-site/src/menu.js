/* ==========================================================================
   La carte réelle de La Moulinière, reprise telle quelle de la feuille
   « Menu Multilingue » (version du 25 août 2026).
   Ordre des langues dans chaque entrée : fr, nl, en, de, it, es.
   ========================================================================== */
var LANGS = ["fr", "nl", "en", "de", "it", "es"];
function t6() {
  var v = arguments, o = {};
  for (var i = 0; i < LANGS.length; i++) o[LANGS[i]] = v[i] !== undefined ? v[i] : v[0];
  return o;
}
function same(s) { return t6(s, s, s, s, s, s); }

var CREAM = t6("crème", "room", "cream", "Sahne", "panna", "nata");

var MENU = {
  moules: {
    price: 29.9,
    nature: 27.9,
    title: t6("Moules", "Mosselen", "Mussels", "Muscheln", "Cozze", "Mejillones"),
    tagline: t6(
      "Le bon goût iodé de la mer, sublimé par nos 40 préparations maison.",
      "De zuivere jodiumsmaak van de zee, verfijnd door onze 40 huisbereide sauzen.",
      "The pure taste of the sea, elevated by our 40 homemade preparations.",
      "Der reine Geschmack des Meeres, veredelt durch unsere 40 hausgemachten Zubereitungen.",
      "Il sapore autentico del mare, esaltato dalle nostre 40 preparazioni della casa.",
      "El auténtico sabor del mar, realzado por nuestras 40 preparaciones caseras."
    ),
    natureLabel: t6(
      "Fidèle à l'authentique ? Nature",
      "Klassiek blijver? Natuur",
      "Keeping it classic? Plain",
      "Lieber klassisch? Natur",
      "Fedele alla tradizione? Al naturale",
      "¿Fiel a lo auténtico? Al natural"
    ),
    light: t6(
      "Toutes nos préparations existent en version légère, sans crème.",
      "Al onze bereidingen bestaan in een lichte versie, zonder room.",
      "All our preparations are available in a light version, without cream.",
      "Alle unsere Zubereitungen gibt es auch in einer leichten Variante, ohne Sahne.",
      "Tutte le nostre preparazioni sono disponibili in versione leggera, senza panna.",
      "Todas nuestras preparaciones existen en versión ligera, sin nata."
    )
  },

  families: [
    {
      id: "tradition",
      name: t6("Tradition", "Traditie", "Tradition", "Tradition", "Tradizione", "Tradición"),
      items: [
        { n: t6("Ail, crème", "Look, room", "Garlic, cream", "Knoblauch, Sahne", "Aglio, panna", "Ajo, nata") },
        { n: t6("Ail", "Look", "Garlic", "Knoblauch", "Aglio", "Ajo") },
        { n: t6("Ail, vin, crème", "Look, wijn, room", "Garlic, wine, cream", "Knoblauch, Wein, Sahne", "Aglio, vino, panna", "Ajo, vino, nata") },
        { n: t6("Crème", "Room", "Cream", "Sahne", "Panna", "Nata") },
        { n: t6("Vin", "Wijn", "Wine", "Wein", "Vino", "Vino") },
        { n: t6("Vin, crème", "Wijn, room", "Wine, cream", "Wein, Sahne", "Vino, panna", "Vino, nata") },
        { n: t6("Curry, crème", "Kerrie, room", "Curry, cream", "Curry, Sahne", "Curry, panna", "Curry, nata") },
        { n: t6("Curry, ail, crème", "Kerrie, look, room", "Curry, garlic, cream", "Curry, Knoblauch, Sahne", "Curry, aglio, panna", "Curry, ajo, nata") },
        { n: t6("Aneth", "Dille", "Dill", "Dill", "Aneto", "Eneldo") },
        { n: t6("Aneth, crème", "Dille, room", "Dill, cream", "Dill, Sahne", "Aneto, panna", "Eneldo, nata") },
        { n: t6("Estragon, crème", "Dragon, room", "Tarragon, cream", "Estragon, Sahne", "Dragoncello, panna", "Estragón, nata") },
        { n: t6("Fenouil, crème", "Venkel, room", "Fennel, cream", "Fenchel, Sahne", "Finocchio, panna", "Hinojo, nata") },
        { n: t6("Thym, crème", "Tijm, room", "Thyme, cream", "Thymian, Sahne", "Timo, panna", "Tomillo, nata") },
        { n: t6("Champignons, ail, crème", "Champignons, look, room", "Mushrooms, garlic, cream", "Champignons, Knoblauch, Sahne", "Funghi, aglio, panna", "Champiñones, ajo, nata") },
        { n: t6("Chicon, crème", "Witloof, room", "Chicory, cream", "Chicorée, Sahne", "Indivia belga, panna", "Endibia, nata") },
        { n: t6("Chicon, ail, crème", "Witloof, look, room", "Chicory, garlic, cream", "Chicorée, Knoblauch, Sahne", "Indivia belga, aglio, panna", "Endibia, ajo, nata") }
      ]
    },
    {
      id: "creations",
      name: t6("Créations", "Creaties", "Creations", "Kreationen", "Creazioni", "Creaciones"),
      items: [
        { n: t6("À l'Ostendaise", "Op zijn Oostends", "Ostend style", "Ostender Art", "All'ostendese", "A la ostendesa"),
          i: t6("vin, bisque, crème", "wijn, bisque, room", "wine, bisque, cream", "Wein, Bisque, Sahne", "vino, bisque, panna", "vino, bisque, nata") },
        { n: t6("À l'Ostendaise", "Op zijn Oostends", "Ostend style", "Ostender Art", "All'ostendese", "A la ostendesa"), s: 5,
          i: t6("vin, bisque, crevettes, crème", "wijn, bisque, garnalen, room", "wine, bisque, shrimp, cream", "Wein, Bisque, Garnelen, Sahne", "vino, bisque, gamberetti, panna", "vino, bisque, gambas, nata") },
        { n: same("Armoricaine"),
          i: t6("vin, bisque, ail, crème", "wijn, bisque, look, room", "wine, bisque, garlic, cream", "Wein, Bisque, Knoblauch, Sahne", "vino, bisque, aglio, panna", "vino, bisque, ajo, nata") },
        { n: same("Armoricaine"), s: 5,
          i: t6("vin, bisque, crevettes, ail, crème", "wijn, bisque, garnalen, look, room", "wine, bisque, shrimp, garlic, cream", "Wein, Bisque, Garnelen, Knoblauch, Sahne", "vino, bisque, gamberetti, aglio, panna", "vino, bisque, gambas, ajo, nata") },
        { n: t6("Mexicaine", "Mexicaine", "Mexican", "Mexikanisch", "Messicana", "Mexicana"),
          i: t6("ail, pili-pili, poivrons, crème", "look, pili-pili, paprika, room", "garlic, pili-pili, peppers, cream", "Knoblauch, Pili-Pili, Paprika, Sahne", "aglio, pili-pili, peperoni, panna", "ajo, pili-pili, pimientos, nata") },
        { n: t6("Italienne", "Italiaans", "Italian", "Italienisch", "Italiana", "Italiana"),
          i: t6("basilic, poivrons, pili-pili", "basilicum, paprika, pili-pili", "basil, peppers, pili-pili", "Basilikum, Paprika, Pili-Pili", "basilico, peperoni, pili-pili", "albahaca, pimientos, pili-pili") },
        { n: same("Pili-Pili"),
          i: t6("pili-pili, poivrons, basilic, crème", "pili-pili, paprika, basilicum, room", "pili-pili, peppers, basil, cream", "Pili-Pili, Paprika, Basilikum, Sahne", "pili-pili, peperoni, basilico, panna", "pili-pili, pimientos, albahaca, nata") },
        { n: t6("Napolitaine", "Napolitaine", "Neapolitan", "Neapolitanisch", "Napoletana", "Napolitana"),
          i: t6("ail, vin, crème tomatée", "look, wijn, tomatenroom", "garlic, wine, tomato cream", "Knoblauch, Wein, Tomatensahne", "aglio, vino, panna al pomodoro", "ajo, vino, nata de tomate") },
        { n: same("Sambre & Meuse"),
          i: t6("estragon, vin, crème tomatée", "dragon, wijn, tomatenroom", "tarragon, wine, tomato cream", "Estragon, Wein, Tomatensahne", "dragoncello, vino, panna al pomodoro", "estragón, vino, nata de tomate") },
        { n: t6("Poivrons, champignons, crème tomatée", "Paprika, champignons, tomatenroom", "Peppers, mushrooms, tomato cream", "Paprika, Champignons, Tomatensahne", "Peperoni, funghi, panna al pomodoro", "Pimientos, champiñones, nata de tomate") },
        { n: t6("Provençale", "Provençale", "Provençal", "Provenzalisch", "Provenzale", "Provenzal"), noTags: true },
        { n: t6("Cosaque", "Kozak", "Cossack", "Kosaken-Art", "Cosacca", "Cosaca"),
          i: t6("champignons, vodka, crème tomatée", "champignons, vodka, tomatenroom", "mushrooms, vodka, tomato cream", "Champignons, Wodka, Tomatensahne", "funghi, vodka, panna al pomodoro", "champiñones, vodka, nata de tomate") },
        { n: t6("Ardennaise", "Ardeens", "Ardennes style", "Ardenner Art", "Ardennese", "Ardenesa"),
          i: t6("champignons, lard, crème", "champignons, spek, room", "mushrooms, bacon, cream", "Champignons, Speck, Sahne", "funghi, pancetta, panna", "champiñones, panceta, nata") },
        { n: same("Poulette"),
          i: t6("vin, champignons, citron", "wijn, champignons, citroen", "wine, mushrooms, lemon", "Wein, Champignons, Zitrone", "vino, funghi, limone", "vino, champiñones, limón") },
        { n: t6("Saumon fumé, aneth, crème", "Gerookte zalm, dille, room", "Smoked salmon, dill, cream", "Räucherlachs, Dill, Sahne", "Salmone affumicato, aneto, panna", "Salmón ahumado, eneldo, nata"), s: 3 },
        { n: t6("Saumon fumé, ail, crème", "Gerookte zalm, look, room", "Smoked salmon, garlic, cream", "Räucherlachs, Knoblauch, Sahne", "Salmone affumicato, aglio, panna", "Salmón ahumado, ajo, nata"), s: 3 }
      ]
    },
    {
      id: "exotique",
      name: t6("Exotique", "Exotisch", "Exotic", "Exotisch", "Esotiche", "Exóticos"),
      items: [
        { n: t6("Gingembre, crème", "Gember, room", "Ginger, cream", "Ingwer, Sahne", "Zenzero, panna", "Jengibre, nata") },
        { n: t6("Piquante", "Pikant", "Spicy", "Pikant", "Piccante", "Picante"),
          i: t6("cognac, pili-pili, crème tomatée", "cognac, pili-pili, tomatenroom", "cognac, pili-pili, tomato cream", "Cognac, Pili-Pili, Tomatensahne", "cognac, pili-pili, panna al pomodoro", "coñac, pili-pili, nata de tomate") },
        { n: t6("Coco", "Coco", "Coconut", "Kokos", "Cocco", "Coco"),
          i: t6("batida, crème", "batida, room", "Batida, cream", "Batida, Sahne", "Batida, panna", "Batida, nata") },
        { n: t6("Curry coco", "Kerrie coco", "Coconut curry", "Kokos-Curry", "Curry al cocco", "Curry de coco"),
          i: t6("curry, batida, banane, crème", "kerrie, batida, banaan, room", "curry, Batida, banana, cream", "Curry, Batida, Banane, Sahne", "curry, Batida, banana, panna", "curry, Batida, plátano, nata") },
        { n: t6("Coco gingembre", "Coco gember", "Coconut ginger", "Kokos-Ingwer", "Cocco e zenzero", "Coco y jengibre"),
          i: t6("batida, gingembre, crème", "batida, gember, room", "Batida, ginger, cream", "Batida, Ingwer, Sahne", "Batida, zenzero, panna", "Batida, jengibre, nata") }
      ]
    },
    {
      id: "fromages",
      name: t6("Fromages", "Kazen", "Cheeses", "Käse", "Formaggi", "Quesos"),
      sup: 2,
      items: [
        { n: t6("Camembert, crème", "Camembert, room", "Camembert, cream", "Camembert, Sahne", "Camembert, panna", "Camembert, nata"), s: 2 },
        { n: t6("Chèvre, lard, crème", "Geitenkaas, spek, room", "Goat's cheese, bacon, cream", "Ziegenkäse, Speck, Sahne", "Formaggio di capra, pancetta, panna", "Queso de cabra, panceta, nata"), s: 2 },
        { n: t6("Chèvre, miel, crème", "Geitenkaas, honing, room", "Goat's cheese, honey, cream", "Ziegenkäse, Honig, Sahne", "Formaggio di capra, miele, panna", "Queso de cabra, miel, nata"), s: 2 },
        { n: t6("Roquefort, crème", "Roquefort, room", "Roquefort, cream", "Roquefort, Sahne", "Roquefort, panna", "Roquefort, nata"), s: 2 },
        { n: t6("Herve, sirop de Liège, crème", "Hervekaas, Luikse siroop, room", "Herve cheese, Liège syrup, cream", "Herve-Käse, Lütticher Sirup, Sahne", "Formaggio Herve, sciroppo di Liegi, panna", "Queso Herve, sirope de Lieja, nata"), s: 2 }
      ]
    },
    {
      id: "caractere",
      name: t6("Caractère", "Karakter", "Character", "Charakter", "Carattere", "Carácter"),
      items: [
        { n: t6("Ricard, crème", "Ricard, room", "Ricard, cream", "Ricard, Sahne", "Ricard, panna", "Ricard, nata") },
        { n: t6("Ricard, ail, crème", "Ricard, look, room", "Ricard, garlic, cream", "Ricard, Knoblauch, Sahne", "Ricard, aglio, panna", "Ricard, ajo, nata") },
        { n: t6("Porto blanc, Noilly Prat, crème", "Witte porto, Noilly Prat, room", "White port, Noilly Prat, cream", "Weißer Portwein, Noilly Prat, Sahne", "Porto bianco, Noilly Prat, panna", "Oporto blanco, Noilly Prat, nata") },
        { n: t6("Normande", "Normandisch", "Norman", "Normannisch", "Normanna", "Normanda"),
          i: t6("Calvados, crème", "Calvados, room", "Calvados, cream", "Calvados, Sahne", "Calvados, panna", "Calvados, nata") }
      ]
    }
  ],

  /* Personnalisation : ingrédients ajoutés à une préparation */
  addons: [
    { s: 1, items: [
      t6("Ail", "Look", "Garlic", "Knoblauch", "Aglio", "Ajo"),
      t6("Aneth", "Dille", "Dill", "Dill", "Aneto", "Eneldo"),
      t6("Basilic", "Basilicum", "Basil", "Basilikum", "Basilico", "Albahaca"),
      t6("Champignon", "Champignon", "Mushroom", "Champignon", "Funghi", "Champiñón"),
      t6("Chicon", "Witloof", "Chicory", "Chicorée", "Indivia belga", "Endibia"),
      t6("Crème", "Room", "Cream", "Sahne", "Panna", "Nata"),
      same("Curry"),
      t6("Estragon", "Dragon", "Tarragon", "Estragon", "Dragoncello", "Estragón"),
      t6("Fenouil", "Venkel", "Fennel", "Fenchel", "Finocchio", "Hinojo"),
      t6("Gingembre", "Gember", "Ginger", "Ingwer", "Zenzero", "Jengibre"),
      t6("Miel", "Honing", "Honey", "Honig", "Miele", "Miel"),
      same("Pili-Pili"),
      t6("Poivrons", "Paprika", "Peppers", "Paprika", "Peperoni", "Pimientos"),
      t6("Thym", "Tijm", "Thyme", "Thymian", "Timo", "Tomillo")
    ] },
    { s: 2, items: [
      same("Batida"), same("Bisque"), same("Calvados"), same("Camembert"),
      t6("Chèvre", "Geitenkaas", "Goat's cheese", "Ziegenkäse", "Formaggio di capra", "Queso de cabra"),
      t6("Cognac", "Cognac", "Cognac", "Cognac", "Cognac", "Coñac"),
      t6("Herve", "Hervekaas", "Herve cheese", "Herve-Käse", "Formaggio Herve", "Queso Herve"),
      t6("Lard", "Spek", "Bacon", "Speck", "Pancetta", "Panceta"),
      same("Noilly Prat"),
      t6("Porto", "Porto", "Port", "Portwein", "Porto", "Oporto"),
      same("Ricard"), same("Roquefort"),
      t6("Vin", "Wijn", "Wine", "Wein", "Vino", "Vino"),
      t6("Vodka", "Vodka", "Vodka", "Wodka", "Vodka", "Vodka")
    ] },
    { s: 3, items: [t6("Saumon", "Zalm", "Salmon", "Lachs", "Salmone", "Salmón")] },
    { s: 5, items: [t6("Crevettes (30 g)", "Garnalen (30 g)", "Shrimp (30 g)", "Garnelen (30 g)", "Gamberetti (30 g)", "Gambas (30 g)")] }
  ],

  /* Autres rubriques de la carte */
  sections: [
    {
      id: "aperitifs",
      name: t6("Apéritifs", "Aperitieven", "Aperitifs", "Aperitifs", "Aperitivi", "Aperitivos"),
      rows: [
        { n: same("Aperol Spritz"), p: 14 },
        { n: t6("Picon maison", "Picon maison", "Homemade Picon", "Picon nach Art des Hauses", "Picon della casa", "Picon de la casa"), p: 12 },
        { n: t6("Apéritif maison", "Aperitief van het huis", "House aperitif", "Hausaperitif", "Aperitivo della casa", "Aperitivo de la casa"), p: 10 },
        { n: same("Gin Bombay + Tonic"), p: 14 },
        { n: same("Cava"), p: 9 },
        { n: same("Kir / Kir royal"), p: [7, 10] },
        { n: same("Ricard"), p: 10 },
        { n: same("Pineau des Charentes"), p: 7 },
        { n: t6("Martini blanc / rouge", "Martini wit / rood", "Martini white / red", "Martini weiß / rot", "Martini bianco / rosso", "Martini blanco / rojo"), p: 7 },
        { n: t6("Porto blanc / rouge", "Porto wit / rood", "Port white / red", "Portwein weiß / rot", "Porto bianco / rosso", "Oporto blanco / tinto"), p: 7 },
        { n: same("Pisang, Passoa, Campari, Batida"), p: 10 },
        { n: same("Vodka, Bacardi, J&B"), p: 10 },
        { n: same("Jack Daniel's Bourbon"), p: 10 },
        { n: t6("Whisky Chivas Regal 12 years", "Whisky Chivas Regal 12 years", "Whisky Chivas Regal 12 years", "Whisky Chivas Regal 12 Jahre", "Whisky Chivas Regal 12 anni", "Whisky Chivas Regal 12 años"), p: 12 },
        { n: t6("Supplément soft", "Supplement soft", "Soft drink supplement", "Aufpreis Softdrink", "Supplemento bibita", "Suplemento refresco"), s: 2 },
        { sub: t6("0 % alcool", "0% alcohol", "0% alcohol", "0 % Alkohol", "0% alcol", "0 % alcohol") },
        { n: same("Homemade Ice tea"), p: 5, d: t6("Pêche / framboise", "Perzik / framboos", "Peach / raspberry", "Pfirsich / Himbeere", "Pesca / lampone", "Melocotón / frambuesa") },
        { n: t6("Homemade Limonade", "Homemade Limonade", "Homemade Lemonade", "Homemade Limonade", "Homemade Limonata", "Homemade Limonada"), p: 5, d: t6("Fruits des bois", "Bosvruchten", "Forest fruits", "Waldfrüchte", "Frutti di bosco", "Frutas del bosque") },
        { n: t6("Apéritif maison sans alcool", "Alcoholvrij aperitief van het huis", "Alcohol-free house aperitif", "Alkoholfreier Hausaperitif", "Aperitivo analcolico della casa", "Aperitivo de la casa sin alcohol"), p: 8 }
      ]
    },
    {
      id: "menus",
      name: t6("Menus", "Menu's", "Set menus", "Menüs", "Menù", "Menús"),
      rows: [
        { n: t6("Menu de la mer", "Menu van de zee", "Sea menu", "Meeresmenü", "Menù del mare", "Menú del mar"), p: 40, list: [
          t6("Croquette de fromages ou de crevettes (+2)", "Kaaskroket of garnaalkroket (+2)", "Cheese or shrimp croquette (+2)", "Käse- oder Garnelenkrokette (+2)", "Crocchetta di formaggio o di gamberetti (+2)", "Croqueta de queso o de gambas (+2)"),
          t6("Moules au choix", "Mosselen naar keuze", "Mussels of your choice", "Muscheln nach Wahl", "Cozze a scelta", "Mejillones a elegir"),
          t6("Café ou thé, ou Irish coffee (+5)", "Koffie of thee, of Irish coffee (+5)", "Coffee or tea, or Irish coffee (+5)", "Kaffee oder Tee, oder Irish Coffee (+5)", "Caffè o tè, o Irish coffee (+5)", "Café o té, o Irish coffee (+5)")
        ] },
        { n: t6("Menu pour 2 pers.", "Menu voor 2 pers.", "Menu for 2", "Menü für 2 Pers.", "Menù per 2 pers.", "Menú para 2 pers."), p: 130, list: [
          t6("2 apéritifs maison ou Cava", "2 aperitieven van het huis of Cava", "2 house aperitifs or Cava", "2 Hausaperitifs oder Cava", "2 aperitivi della casa o Cava", "2 aperitivos de la casa o Cava"),
          t6("2 moules au choix", "2 mosselen naar keuze", "2 x mussels of your choice", "2 x Muscheln nach Wahl", "2 x cozze a scelta", "2 x mejillones a elegir"),
          t6("1 bouteille de Colombard Van Loveren", "1 fles Colombard Van Loveren", "1 bottle of Colombard Van Loveren", "1 Flasche Colombard Van Loveren", "1 bottiglia di Colombard Van Loveren", "1 botella de Colombard Van Loveren"),
          t6("Irish coffee ou dessert au choix (*+5)", "Irish coffee of dessert naar keuze (*+5)", "Irish coffee or dessert of your choice (*+5)", "Irish Coffee oder Dessert nach Wahl (*+5)", "Irish coffee o dessert a scelta (*+5)", "Irish coffee o postre a elegir (*+5)")
        ] }
      ]
    },
    {
      id: "formules",
      name: t6("Formules 2 pers.", "Formules 2 pers.", "Deals for 2", "Pakete für 2 Pers.", "Formule per 2 pers.", "Fórmulas para 2 pers."),
      common: t6("2 moules au choix", "2 mosselen naar keuze", "2 x mussels of your choice", "2 x Muscheln nach Wahl", "2 x cozze a scelta", "2 x mejillones a elegir"),
      rows: [
        { id: "vin", n: t6("Formule Vin", "Formule Wijn", "Wine deal", "Wein-Paket", "Formula Vino", "Fórmula Vino"), p: 89,
          d: t6("& 1 bouteille de Elle & Lui", "& 1 fles Elle & Lui", "& 1 bottle of Elle & Lui", "& 1 Flasche Elle & Lui", "& 1 bottiglia di Elle & Lui", "& 1 botella de Elle & Lui") },
        { id: "pinot", n: t6("Formule Pinot Grigio", "Formule Pinot Grigio", "Pinot Grigio deal", "Pinot-Grigio-Paket", "Formula Pinot Grigio", "Fórmula Pinot Grigio"), p: 91,
          d: t6("& 1 bouteille de Pinot Grigio", "& 1 fles Pinot Grigio", "& 1 bottle of Pinot Grigio", "& 1 Flasche Pinot Grigio", "& 1 bottiglia di Pinot Grigio", "& 1 botella de Pinot Grigio") },
        { id: "muscadet", n: t6("Formule Muscadet", "Formule Muscadet", "Muscadet deal", "Muscadet-Paket", "Formula Muscadet", "Fórmula Muscadet"), p: 95,
          d: t6("& 1 bouteille de Muscadet", "& 1 fles Muscadet", "& 1 bottle of Muscadet", "& 1 Flasche Muscadet", "& 1 bottiglia di Muscadet", "& 1 botella de Muscadet") }
      ]
    },
    {
      id: "tapas",
      name: same("Tapas"),
      rows: [
        { n: t6("Croquettes de crevettes 1/2 pc.", "Garnaalkroketten 1/2 st.", "Shrimp croquettes 1/2 pcs", "Garnelenkroketten 1/2 St.", "Crocchette di gamberetti 1/2 pz.", "Croquetas de gambas 1/2 ud."), p: [13, 20] },
        { n: t6("Croquettes de fromages 1/2 pc.", "Kaaskroketten 1/2 st.", "Cheese croquettes 1/2 pcs", "Käsekroketten 1/2 St.", "Crocchette di formaggio 1/2 pz.", "Croquetas de queso 1/2 ud."), p: [10, 17] },
        { n: t6("Mix mini-croquettes à partager 10 pc.", "Mix mini kroketten om te delen 10 st.", "Mixed mini croquettes to share 10 pcs", "Mini-Kroketten-Mix zum Teilen 10 St.", "Mix di mini crocchette da condividere 10 pz.", "Mix de mini croquetas para compartir 10 ud."), p: 26 },
        { n: t6("Calamars frits", "Gepaneerde calamares", "Fried calamari", "Frittierte Calamari", "Calamari fritti", "Calamares fritos"), p: 17 },
        { n: t6("Assiette de saumon fumé", "Bord gerookte zalm", "Smoked salmon plate", "Räucherlachsteller", "Piatto di salmone affumicato", "Plato de salmón ahumado"), p: 18 }
      ],
      note: t6("Tapas servies en entrée uniquement", "Tapas enkel geserveerd als voorgerecht", "Tapas served as a starter only", "Tapas nur als Vorspeise", "Tapas servite solo come antipasto", "Tapas servidas solo como entrante")
    },
    {
      id: "plats",
      name: t6("Plats", "Hoofdgerechten", "Main courses", "Hauptgerichte", "Piatti principali", "Platos principales"),
      rows: [
        { n: t6("Croquettes de crevettes 3 pc.", "Garnaalkroketten 3 st.", "Shrimp croquettes 3 pcs", "Garnelenkroketten 3 St.", "Crocchette di gamberetti 3 pz.", "Croquetas de gambas 3 ud."), p: 32 },
        { n: t6("Croquettes de fromages 3 pc.", "Kaaskroketten 3 st.", "Cheese croquettes 3 pcs", "Käsekroketten 3 St.", "Crocchette di formaggio 3 pz.", "Croquetas de queso 3 ud."), p: 28 },
        { n: t6("Mix croquettes (crevettes & fromages) 4 pc.", "Mix kroketten (garnalen & kaas) 4 st.", "Mixed croquettes (shrimp & cheese) 4 pcs", "Kroketten-Mix (Garnelen & Käse) 4 St.", "Mix di crocchette (gamberetti & formaggio) 4 pz.", "Mix de croquetas (gambas & queso) 4 ud."), p: 36 },
        { n: t6("Calamars frits", "Gepaneerde calamares", "Fried calamari", "Frittierte Calamari", "Calamari fritti", "Calamares fritos"), p: 26 },
        { n: t6("Poulet pané", "Gepaneerde kip", "Breaded chicken", "Paniertes Hähnchen", "Pollo impanato", "Pollo empanado"), p: 26 },
        { n: t6("Assiette de saumon fumé", "Bord gerookte zalm", "Smoked salmon plate", "Räucherlachsteller", "Piatto di salmone affumicato", "Plato de salmón ahumado"), p: 29 }
      ]
    },
    {
      id: "enfants",
      name: t6("Enfants < 12 ans", "Kinderen < 12 jaar", "Children < 12 years", "Kinder < 12 Jahre", "Bambini < 12 anni", "Niños < 12 años"),
      rows: [
        { n: t6("Moules nature / au choix", "Mosselen natuur / naar keuze", "Mussels plain / of your choice", "Muscheln natur / nach Wahl", "Cozze al naturale / a scelta", "Mejillones al natural / a elegir"), p: [20, 22] },
        { n: t6("Croquettes de crevettes 1/2 pc.", "Garnaalkroket 1/2 st.", "Shrimp croquettes 1/2 pcs", "Garnelenkroketten 1/2 St.", "Crocchette di gamberetti 1/2 pz.", "Croquetas de gambas 1/2 ud."), p: [16, 23] },
        { n: t6("Croquettes de fromages 1/2 pc.", "Kaaskroket 1/2 st.", "Cheese croquettes 1/2 pcs", "Käsekroketten 1/2 St.", "Crocchette di formaggio 1/2 pz.", "Croquetas de queso 1/2 ud."), p: [13, 20] },
        { n: t6("Fricandelles 2/3 pc.", "Frikandellen 2/3 st.", "Frikandel 2/3 pcs", "Frikandel 2/3 St.", "Frikandel 2/3 pz.", "Frikandel 2/3 ud."), p: [12, 15] },
        { n: t6("Poisson pané", "Gepaneerde vis", "Breaded fish", "Panierter Fisch", "Pesce impanato", "Pescado empanado"), p: 15 },
        { n: t6("Calamars frits", "Gepaneerde calamares", "Fried calamari", "Frittierte Calamari", "Calamari fritti", "Calamares fritos"), p: 15 },
        { n: same("Nuggets"), p: 15 }
      ],
      note: t6("Plat enfant réservé aux moins de 12 ans", "Enkel voor kinderen tot 12 jaar", "Children's dish for under 12s only", "Kindergericht nur für Kinder unter 12 Jahren", "Piatto bambini riservato ai minori di 12 anni", "Plato infantil reservado a menores de 12 años")
    },
    {
      id: "desserts",
      name: t6("Desserts", "Desserts", "Desserts", "Desserts", "Dessert", "Postres"),
      rows: [
        { n: t6("Moelleux au chocolat", "Chocolade moelleux", "Chocolate fondant", "Schokoladen-Moelleux", "Tortino al cioccolato", "Coulant de chocolate"), p: 9 },
        { n: same("Dame blanche"), p: 9 },
        { n: t6("Café glacé", "IJskoffie", "Café glacé", "Eiskaffee", "Café glacé", "Café glacé"), p: 9 },
        { n: t6("Coupe 1 ou 2 boules", "Coupe 1 of 2 bollen", "Ice cream 1 or 2 scoops", "Eisbecher 1 oder 2 Kugeln", "Coppa 1 o 2 palline", "Copa 1 o 2 bolas"), p: [4, 7],
          d: t6("Vanille, chocolat, café", "Vanille, chocolade, mokka", "Vanilla, chocolate, coffee", "Vanille, Schokolade, Kaffee", "Vaniglia, cioccolato, caffè", "Vainilla, chocolate, café") },
        { n: t6("Tarte aux pommes", "Appeltaart", "Apple pie", "Apfelkuchen", "Torta di mele", "Tarta de manzana"), p: 9,
          d: t6("Flambée au Calvados (+5)", "Geflambeerd met Calvados (+5)", "Flambéed with Calvados (+5)", "Flambiert mit Calvados (+5)", "Flambé al Calvados (+5)", "Flambeada con Calvados (+5)") },
        { n: same("Coupe Baileys *"), p: 13 }
      ]
    },
    {
      id: "cafes",
      name: t6("Cafés", "Koffies", "Coffees", "Kaffee", "Caffè", "Cafés"),
      rows: [
        { n: t6("Café / Espresso", "Koffie / Espresso", "Coffee / Espresso", "Kaffee / Espresso", "Caffè / Espresso", "Café / Espresso"), p: 4 },
        { n: t6("Double espresso", "Dubbele espresso", "Double espresso", "Doppelter Espresso", "Espresso doppio", "Espresso doble"), p: 4.5 },
        { n: same("Cappuccino"), p: 4.8 },
        { n: same("Café Latte"), p: 5.3 },
        { n: same("Macchiato"), p: 5.3 },
        { n: t6("Thé bio", "Bio thee", "Organic tea", "Bio-Tee", "Tè bio", "Té ecológico"), p: 5 },
        { n: same("Irish coffee"), p: 12 },
        { n: same("Italian coffee"), p: 12 },
        { n: same("French coffee"), p: 14 }
      ]
    },
    {
      id: "softs",
      name: t6("Soft", "Soft", "Soft drinks", "Softdrinks", "Bibite", "Refrescos"),
      rows: [
        { n: same("Homemade Ice tea"), p: 5, d: t6("Pêche / framboise", "Perzik / framboos", "Peach / raspberry", "Pfirsich / Himbeere", "Pesca / lampone", "Melocotón / frambuesa") },
        { n: t6("Homemade Limonade", "Homemade Limonade", "Homemade Lemonade", "Homemade Limonade", "Homemade Limonata", "Homemade Limonada"), p: 5, d: t6("Fruits des bois", "Bosvruchten", "Forest fruits", "Waldfrüchte", "Frutti di bosco", "Frutas del bosque") },
        { n: t6("Coca-Cola / Zéro", "Coca-Cola / Zero", "Coca-Cola / Zero", "Coca-Cola / Zero", "Coca-Cola / Zero", "Coca-Cola / Zero"), p: 3.5 },
        { n: t6("Orangeade", "Orangeade", "Orangeade", "Orangenlimonade", "Aranciata", "Naranjada"), p: 3.5 },
        { n: same("Ice tea"), p: 3.5 },
        { n: same("Tonic"), p: 4.5 },
        { n: t6("Jus d'orange, pomme, ananas", "Sinaasappelsap, appel, ananas", "Orange, apple, pineapple juice", "Saft: Orange, Apfel, Ananas", "Succo d'arancia, mela, ananas", "Zumo de naranja, manzana, piña"), p: 3.5 },
        { n: t6("Eau plate / pétillante 75 cl", "Plat / bruiswater 75 cl", "Still / sparkling water 75 cl", "Stilles / Sprudelwasser 75 cl", "Acqua naturale / frizzante 75 cl", "Agua sin gas / con gas 75 cl"), p: 6 }
      ],
      note: t6("Nous servons une eau filtrée, fraîche et de qualité.", "Wij serveren gefilterd, fris en kwalitatief water.", "We serve fresh, quality filtered water.", "Wir servieren frisches, gefiltertes Qualitätswasser.", "Serviamo acqua filtrata, fresca e di qualità.", "Servimos agua filtrada, fresca y de calidad.")
    },
    {
      id: "bieres",
      name: t6("Bières", "Bieren", "Beers", "Biere", "Birre", "Cervezas"),
      rows: [
        { n: t6("Duvel blonde", "Duvel blond", "Duvel blond", "Duvel blond", "Duvel bionda", "Duvel rubia"), p: 6 },
        { n: t6("Petrus blonde 33 cl", "Petrus blond 33 cl", "Petrus blond 33 cl", "Petrus blond 33 cl", "Petrus bionda 33 cl", "Petrus rubia 33 cl"), p: 6 },
        { n: t6("Petrus blonde triple 33 cl", "Petrus blond tripel 33 cl", "Petrus blond tripel 33 cl", "Petrus blond Tripel 33 cl", "Petrus bionda tripel 33 cl", "Petrus rubia tripel 33 cl"), p: 6 },
        { n: same("Petrus roodbruin"), p: 6 },
        { n: t6("Stella Artois (pression) 25 / 50 cl", "Stella Artois (tap) 25 / 50 cl", "Stella Artois (draught) 25 / 50 cl", "Stella Artois (vom Fass) 25 / 50 cl", "Stella Artois (alla spina) 25 / 50 cl", "Stella Artois (de barril) 25 / 50 cl"), p: [4, 7] },
        { n: same("Bavik super wit"), p: 4 },
        { n: same("Kriek premium St-Louis"), p: 4 },
        { sub: t6("0,2 % alcool", "0,2% alcohol", "0.2% alcohol", "0,2 % Alkohol", "0,2% alcol", "0,2 % alcohol") },
        { n: same("Sportzot"), p: 7 }
      ]
    },
    {
      id: "vins",
      name: t6("Carte des vins", "Wijnkaart", "Wine list", "Weinkarte", "Carta dei vini", "Carta de vinos"),
      rows: [
        { n: t6("Vin maison blanc Elle & Lui", "Huiswijn wit Elle & Lui", "House white Elle & Lui", "Hauswein weiß Elle & Lui", "Vino della casa bianco Elle & Lui", "Vino de la casa blanco Elle & Lui"), w: [6, 23, 32] },
        { n: t6("Vin maison rosé", "Huiswijn rosé", "House rosé", "Hauswein rosé", "Vino della casa rosato", "Vino de la casa rosado"), w: [6, 23, 32] },
        { n: t6("Vin maison rouge", "Huiswijn rood", "House red", "Hauswein rot", "Vino della casa rosso", "Vino de la casa tinto"), w: [6, 23, 32] },
        { n: same("Cava"), w: [9, null, 48] },
        { n: same("Champagne A. Bergère Réserve Brut"), p: 82 },
        { sub: t6("Blanc", "Wit", "White", "Weiß", "Bianchi", "Blancos") },
        { n: same("Chardonnay Mâcon-Villages"), p: 50 },
        { n: same("Barrique Vrede & Lust"), p: 44 },
        { n: same("Sauvignon blanc Petit Bourgeois"), p: 42 },
        { n: t6("Van Loveren Colombard, Afrique du Sud", "Van Loveren Colombard, Zuid-Afrika", "Van Loveren Colombard, South Africa", "Van Loveren Colombard, Südafrika", "Van Loveren Colombard, Sudafrica", "Van Loveren Colombard, Sudáfrica"), p: 42 },
        { n: same("Muscadet Sèvre & Maine"), p: 40 },
        { n: same("Pinot Grigio Bella Modella"), p: 36 },
        { sub: t6("Rouge", "Rood", "Red", "Rot", "Rossi", "Tintos") },
        { n: same("Pinotage Minne Goed"), p: 32 },
        { n: same("Pinot Noir The Valley"), p: 45 },
        { n: same("Cinsault Focal Point Stellenbosch"), p: 48 }
      ]
    },
    {
      id: "extra",
      name: same("Extra"),
      rows: [
        { n: t6("Frites petite / grande", "Frietjes klein / groot", "Fries small / large", "Pommes klein / groß", "Patatine fritte piccola / grande", "Patatas fritas pequeña / grande"), p: [4, 6] },
        { n: t6("Salade", "Sla", "Salad", "Salat", "Insalata", "Ensalada"), p: 3 }
      ]
    }
  ],

  wineUnits: t6(["Verre", "Pichet", "Bouteille"], ["Glas", "Karaf", "Fles"], ["Glass", "Carafe", "Bottle"], ["Glas", "Karaffe", "Flasche"], ["Calice", "Caraffa", "Bottiglia"], ["Copa", "Jarra", "Botella"]),

  footer: [
    t6("1 addition par table s.v.p.", "1 rekening per tafel a.u.b.", "1 bill per table please", "1 Rechnung pro Tisch bitte", "1 conto per tavolo, grazie", "1 cuenta por mesa, por favor"),
    t6("Paiement via Payconiq, application bancaire ou cash", "Betaling via Payconiq, bankapp of cash", "Payment by Payconiq, banking app or cash", "Zahlung per Payconiq, Banking-App oder bar", "Pagamento con Payconiq, app bancaria o contanti", "Pago con Payconiq, app bancaria o efectivo")
  ]
};

/* Accords proposés (suggestion éditoriale, à valider avec Benjamin) */
var PAIRINGS = {
  classic: { wine: "Muscadet Sèvre & Maine", price: 40, formula: "muscadet" },
  seafood: { wine: "Chardonnay Mâcon-Villages", price: 50 },
  spicy: { wine: "Van Loveren Colombard", price: 42 },
  tomato: { wine: "Pinot Grigio Bella Modella", price: 36, formula: "pinot" },
  cheese: { wine: "Barrique Vrede & Lust", price: 44 },
  spirit: { wine: "Sauvignon blanc Petit Bourgeois", price: 42 },
  house: { wine: "Elle & Lui", price: 32, formula: "vin" }
};
