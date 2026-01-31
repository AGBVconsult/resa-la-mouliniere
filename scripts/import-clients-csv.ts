/**
 * Script pour importer des clients depuis un fichier CSV.
 * 
 * Usage:
 *   npx ts-node scripts/import-clients-csv.ts <chemin-vers-fichier.csv>
 * 
 * Format CSV attendu (séparateur: virgule ou point-virgule):
 *   Prénom,Nom,Code,Téléphone,email,Réservations
 *   Heidi,Duchateau,32,486769844,duchateau.heidi@gmail.com,47
 * 
 * Le script:
 * 1. Parse le CSV
 * 2. Convertit en format JSON pour la mutation
 * 3. Envoie par batches de 100 à la mutation clients:importCsv
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as fs from "fs";
import * as path from "path";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://accomplished-lemur-852.convex.cloud";
const BATCH_SIZE = 100;

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
  const lastNameIdx = headers.findIndex(h => h.includes("nom") && !h.includes("prénom") || h === "lastname");
  const codeIdx = headers.findIndex(h => h === "code" || h.includes("indicatif"));
  const phoneIdx = headers.findIndex(h => h.includes("téléphone") || h.includes("telephone") || h === "phone");
  const emailIdx = headers.findIndex(h => h.includes("email") || h.includes("mail"));
  const visitsIdx = headers.findIndex(h => h.includes("réservation") || h.includes("reservation") || h.includes("visite") || h === "totalvisits");

  if (phoneIdx === -1) {
    throw new Error("Colonne téléphone non trouvée dans le CSV");
  }

  const rows: CsvRow[] = [];

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
      console.warn(`Ligne ${i + 1}: téléphone invalide "${phoneRaw}", ignorée`);
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

  return rows;
}

async function importBatch(client: ConvexHttpClient, rows: CsvRow[], batchNum: number): Promise<{ created: number; updated: number; errors: number }> {
  try {
    const result = await client.mutation(api.clients.importFromCSV, { rows });
    console.log(`  Batch ${batchNum}: ${result.created} créés, ${result.updated} mis à jour, ${result.errors.length} erreurs`);
    if (result.errors.length > 0) {
      result.errors.slice(0, 5).forEach((e: { row: number; error: string }) => {
        console.warn(`    - Ligne ${e.row}: ${e.error}`);
      });
      if (result.errors.length > 5) {
        console.warn(`    ... et ${result.errors.length - 5} autres erreurs`);
      }
    }
    return { created: result.created, updated: result.updated, errors: result.errors.length };
  } catch (error) {
    console.error(`  Batch ${batchNum}: ERREUR -`, error);
    return { created: 0, updated: 0, errors: rows.length };
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Usage: npx ts-node scripts/import-clients-csv.ts <fichier.csv>");
    console.log("");
    console.log("Format CSV attendu:");
    console.log("  Prénom,Nom,Code,Téléphone,email,Réservations");
    console.log("  Heidi,Duchateau,32,486769844,duchateau.heidi@gmail.com,47");
    process.exit(1);
  }

  const csvPath = path.resolve(args[0]);
  
  if (!fs.existsSync(csvPath)) {
    console.error(`Fichier non trouvé: ${csvPath}`);
    process.exit(1);
  }

  console.log(`Lecture du fichier: ${csvPath}`);
  const content = fs.readFileSync(csvPath, "utf-8");

  console.log("Parsing du CSV...");
  const rows = parseCSV(content);
  console.log(`${rows.length} lignes valides trouvées`);

  if (rows.length === 0) {
    console.log("Aucune donnée à importer");
    process.exit(0);
  }

  console.log(`\nConnexion à Convex: ${CONVEX_URL}`);
  const client = new ConvexHttpClient(CONVEX_URL);

  // Note: Pour l'authentification admin, vous devez être connecté
  // Le script utilise les credentials de l'environnement

  console.log(`\nImport par batches de ${BATCH_SIZE}...`);
  
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    
    console.log(`\nBatch ${batchNum}/${totalBatches} (${batch.length} lignes)...`);
    const result = await importBatch(client, batch, batchNum);
    
    totalCreated += result.created;
    totalUpdated += result.updated;
    totalErrors += result.errors;
  }

  console.log("\n========================================");
  console.log("IMPORT TERMINÉ");
  console.log("========================================");
  console.log(`  Clients créés:    ${totalCreated}`);
  console.log(`  Clients mis à jour: ${totalUpdated}`);
  console.log(`  Erreurs:          ${totalErrors}`);
  console.log("========================================");
}

main().catch((error) => {
  console.error("Erreur fatale:", error);
  process.exit(1);
});
