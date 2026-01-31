/**
 * Script pour convertir un fichier CSV en JSON pour la mutation clients:importFromCSV.
 * 
 * Usage:
 *   npx ts-node scripts/csv-to-json.ts <fichier.csv> [output.json]
 * 
 * Format CSV attendu (séparateur: virgule ou point-virgule):
 *   Prénom,Nom,Code,Téléphone,email,Réservations
 *   Heidi,Duchateau,32,486769844,duchateau.heidi@gmail.com,47
 * 
 * Le script génère un fichier JSON prêt à être utilisé dans le dashboard Convex.
 */

import * as fs from "fs";
import * as path from "path";

interface CsvRow {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  totalVisits: number;
}

function parseCSV(content: string): CsvRow[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("Le fichier CSV doit contenir au moins une ligne d'en-tête et une ligne de données");
  }

  // Detect separator (comma or semicolon)
  const headerLine = lines[0];
  const separator = headerLine.includes(";") ? ";" : ",";

  // Parse header to find column indices
  const headers = headerLine.split(separator).map(h => h.trim().toLowerCase());
  
  const firstNameIdx = headers.findIndex(h => h.includes("prénom") || h.includes("prenom") || h === "firstname");
  const lastNameIdx = headers.findIndex(h => (h.includes("nom") && !h.includes("prénom") && !h.includes("prenom")) || h === "lastname");
  const codeIdx = headers.findIndex(h => h === "code" || h.includes("indicatif"));
  const phoneIdx = headers.findIndex(h => h.includes("téléphone") || h.includes("telephone") || h === "phone");
  const emailIdx = headers.findIndex(h => h.includes("email") || h.includes("mail"));
  const visitsIdx = headers.findIndex(h => h.includes("réservation") || h.includes("reservation") || h.includes("visite") || h === "totalvisits");

  console.log("Colonnes détectées:");
  console.log(`  - Prénom: ${firstNameIdx >= 0 ? headers[firstNameIdx] : "NON TROUVÉ"}`);
  console.log(`  - Nom: ${lastNameIdx >= 0 ? headers[lastNameIdx] : "NON TROUVÉ"}`);
  console.log(`  - Code: ${codeIdx >= 0 ? headers[codeIdx] : "NON TROUVÉ"}`);
  console.log(`  - Téléphone: ${phoneIdx >= 0 ? headers[phoneIdx] : "NON TROUVÉ"}`);
  console.log(`  - Email: ${emailIdx >= 0 ? headers[emailIdx] : "NON TROUVÉ"}`);
  console.log(`  - Réservations: ${visitsIdx >= 0 ? headers[visitsIdx] : "NON TROUVÉ"}`);

  if (phoneIdx === -1) {
    throw new Error("Colonne téléphone non trouvée dans le CSV");
  }

  const rows: CsvRow[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(separator).map(v => v.trim());

    const firstName = firstNameIdx >= 0 ? values[firstNameIdx] || "" : "";
    const lastName = lastNameIdx >= 0 ? values[lastNameIdx] || "" : "";
    const code = codeIdx >= 0 ? values[codeIdx] || "" : "";
    const phoneRaw = phoneIdx >= 0 ? values[phoneIdx] || "" : "";
    const email = emailIdx >= 0 ? values[emailIdx] || "" : "";
    const visitsRaw = visitsIdx >= 0 ? values[visitsIdx] || "0" : "0";

    // Build phone number with country code
    let phone = phoneRaw.replace(/[^0-9]/g, "");
    if (code) {
      const cleanCode = code.replace(/[^0-9]/g, "");
      if (cleanCode && !phone.startsWith(cleanCode)) {
        phone = `+${cleanCode}${phone}`;
      } else {
        phone = `+${phone}`;
      }
    } else if (!phone.startsWith("+")) {
      phone = `+${phone}`;
    }

    const totalVisits = parseInt(visitsRaw, 10) || 0;

    if (phone.length < 8) {
      skipped++;
      continue;
    }

    rows.push({
      firstName,
      lastName,
      phone,
      email,
      totalVisits,
    });
  }

  if (skipped > 0) {
    console.log(`\n${skipped} lignes ignorées (téléphone invalide)`);
  }

  return rows;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Usage: npx ts-node scripts/csv-to-json.ts <fichier.csv> [output.json]");
    console.log("");
    console.log("Format CSV attendu:");
    console.log("  Prénom,Nom,Code,Téléphone,email,Réservations");
    console.log("  Heidi,Duchateau,32,486769844,duchateau.heidi@gmail.com,47");
    process.exit(1);
  }

  const csvPath = path.resolve(args[0]);
  const outputPath = args[1] ? path.resolve(args[1]) : csvPath.replace(/\.csv$/i, ".json");
  
  if (!fs.existsSync(csvPath)) {
    console.error(`Fichier non trouvé: ${csvPath}`);
    process.exit(1);
  }

  console.log(`Lecture du fichier: ${csvPath}\n`);
  const content = fs.readFileSync(csvPath, "utf-8");

  const rows = parseCSV(content);
  console.log(`\n${rows.length} lignes valides`);

  if (rows.length === 0) {
    console.log("Aucune donnée à exporter");
    process.exit(0);
  }

  // Create the JSON structure for the mutation
  const output = { rows };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\nFichier JSON créé: ${outputPath}`);
  
  // Show stats
  const totalVisits = rows.reduce((sum, r) => sum + r.totalVisits, 0);
  console.log(`\nStatistiques:`);
  console.log(`  - Clients: ${rows.length}`);
  console.log(`  - Total visites: ${totalVisits}`);
  console.log(`  - Moyenne visites/client: ${(totalVisits / rows.length).toFixed(1)}`);

  console.log(`\n========================================`);
  console.log(`Pour importer dans Convex:`);
  console.log(`1. Ouvrir le dashboard Convex`);
  console.log(`2. Aller dans Functions → clients:importFromCSV`);
  console.log(`3. Coller le contenu de ${path.basename(outputPath)}`);
  console.log(`========================================`);
}

main();
