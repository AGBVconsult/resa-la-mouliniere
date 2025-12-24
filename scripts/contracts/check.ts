import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { generateFromMarkdownFile, normalizeEol } from "./generate";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

export function isAllowedTurnstileUsage(filePathRelative: string, fileContent: string): { allowed: boolean; reason: string } {
  if (filePathRelative === "spec/CONTRACTS.md") {
    return { allowed: true, reason: "source of truth" };
  }

  if (filePathRelative === "convex/schema.ts") {
    return { allowed: true, reason: "schema definition" };
  }

  if (filePathRelative.startsWith("src/")) {
    return { allowed: false, reason: "forbidden in client src/**" };
  }

  if (filePathRelative.startsWith("app/")) {
    return { allowed: false, reason: "forbidden in Next.js app/**" };
  }

  if (filePathRelative.startsWith("convex/") && filePathRelative.endsWith(".ts")) {
    const contentNoComments = fileContent
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    if (!contentNoComments.includes("turnstileSecretKey")) {
      return { allowed: true, reason: "turnstileSecretKey appears only in comments" };
    }

    const blockHas = (exportName: string, kind: "query" | "mutation" | "action" | "internalMutation"): boolean => {
      const startRe = new RegExp(`export\\s+(?:const|function)\\s+${exportName}\\s*=\\s*${kind}\\s*\\(`);
      const m = contentNoComments.match(startRe);
      if (!m || m.index === undefined) return false;
      const start = m.index;
      const rest = contentNoComments.slice(start);
      const endIdx = rest.indexOf("});");
      const end = endIdx === -1 ? contentNoComments.length : start + endIdx + 3;
      const block = contentNoComments.slice(start, end);
      return block.includes("turnstileSecretKey");
    };

    const hasAnyActionExport = /export\s+(?:const|function)\s+\w+\s*=\s*action\s*\(/.test(contentNoComments);
    const hasAnyInternalMutationExport = /export\s+(?:const|function)\s+\w+\s*=\s*internalMutation\s*\(/.test(contentNoComments);

    // If ANY query block references the secret, it's forbidden.
    const anyQueryHasSecret =
      /export\s+(?:const|function)\s+\w+\s*=\s*query\s*\(/.test(contentNoComments) &&
      (() => {
        const re = /export\s+(?:const|function)\s+(\w+)\s*=\s*query\s*\(/g;
        for (const m of contentNoComments.matchAll(re)) {
          const name = m[1];
          if (blockHas(name, "query")) return true;
        }
        return false;
      })();
    if (anyQueryHasSecret) {
      return { allowed: false, reason: "turnstileSecretKey used in query() — FORBIDDEN" };
    }

    // If a mutation block references the secret, only admin.updateSecrets is allowed.
    const anyMutationHasSecret =
      /export\s+(?:const|function)\s+\w+\s*=\s*mutation\s*\(/.test(contentNoComments) &&
      (() => {
        const re = /export\s+(?:const|function)\s+(\w+)\s*=\s*mutation\s*\(/g;
        for (const m of contentNoComments.matchAll(re)) {
          const name = m[1];
          if (blockHas(name, "mutation")) return true;
        }
        return false;
      })();
    if (anyMutationHasSecret) {
      const isAdminUpdateSecrets = filePathRelative === "convex/admin.ts" && blockHas("updateSecrets", "mutation");
      if (isAdminUpdateSecrets) {
        return { allowed: true, reason: "turnstileSecretKey used in admin.updateSecrets mutation()" };
      }
      return { allowed: false, reason: "turnstileSecretKey used in mutation() — FORBIDDEN" };
    }

    if (hasAnyActionExport) {
      return { allowed: true, reason: "turnstileSecretKey used in action() context" };
    }

    if (hasAnyInternalMutationExport) {
      return { allowed: true, reason: "turnstileSecretKey used in internalMutation() context" };
    }

    return { allowed: false, reason: "turnstileSecretKey used in convex/*.ts without action()/internalMutation() context — FORBIDDEN" };
  }

  return { allowed: false, reason: "turnstileSecretKey is forbidden outside Convex actions" };
}

/**
 * Sensitive patterns that should never appear in console.* calls.
 * Includes secrets, PII fields, and objects that may contain them.
 * Note: We use specific patterns to avoid false positives on variable names like "settingsId".
 */
const SENSITIVE_LOG_PATTERNS = [
  "turnstileSecretKey",
  "turnstileToken",
  "\\bsecretKey\\b",
  "\\bapiKey\\b",
  "resendApiKey",
  // PII fields - only match when they appear as standalone identifiers being logged
  // Avoid matching "settingsId" or "emailJob" etc.
] as const;

/**
 * Patterns that indicate logging a full object that may contain secrets.
 * These are checked separately with stricter matching.
 */
const SENSITIVE_OBJECT_PATTERNS = [
  /console\.\w+\(\s*settings\s*\)/,  // console.log(settings)
  /console\.\w+\([^)]*,\s*settings\s*[,)]/,  // console.log("x", settings)
] as const;

export function checkNoSecretInLogs(filePathRelative: string, fileContent: string): { ok: boolean; reason?: string } {
  // Check for sensitive patterns in console.* call arguments
  const callRe = /console\.(log|error|warn|info)\s*\(([^)]*)\)/g;
  for (const m of fileContent.matchAll(callRe)) {
    const args = m[2] ?? "";
    
    for (const pattern of SENSITIVE_LOG_PATTERNS) {
      const re = new RegExp(pattern, "i");
      if (re.test(args)) {
        return { ok: false, reason: `sensitive data "${pattern}" may leak via console.*` };
      }
    }
  }

  // Check for logging full settings object
  for (const pattern of SENSITIVE_OBJECT_PATTERNS) {
    if (pattern.test(fileContent)) {
      return { ok: false, reason: "logging settings object may leak turnstileSecretKey" };
    }
  }

  return { ok: true };
}

function walkFiles(dir: string, opts: { includeExts?: string[]; ignoreDirs?: string[] }): string[] {
  const out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (opts.ignoreDirs?.includes(ent.name)) continue;
      out.push(...walkFiles(full, opts));
      continue;
    }
    if (opts.includeExts && !opts.includeExts.some((e) => ent.name.endsWith(e))) continue;
    out.push(full);
  }
  return out;
}

function checkGeneratedUpToDate(repoRoot: string): void {
  const { outputPath, contents } = generateFromMarkdownFile({
    repoRoot,
    markdownRelativePath: "spec/CONTRACTS.md",
  });

  if (!fs.existsSync(outputPath)) {
    fail(`Missing ${path.relative(repoRoot, outputPath)}. Run: pnpm contracts:generate`);
  }

  const onDisk = normalizeEol(fs.readFileSync(outputPath, "utf8"));
  const inMem = normalizeEol(contents);

  if (onDisk !== inMem) {
    fail(`contracts.generated.ts is out of date. Run: pnpm contracts:generate`);
  }
}

function readExpectedApiNames(repoRoot: string): string[] {
  const generatedPath = path.join(repoRoot, "spec/contracts.generated.ts");
  const txt = fs.readFileSync(generatedPath, "utf8");

  const takeArray = (name: string): string[] => {
    const re = new RegExp(`export const ${name} = \\[(\\s|\\S)*?\\] as const;`, "m");
    const m = txt.match(re);
    if (!m) return [];
    const arrayLiteral = m[0].match(/\[(\s|\S)*\]/)?.[0];
    if (!arrayLiteral) return [];
    // This is generated by our tool (JSON.stringify), so safe to parse as JSON after trimming.
    return JSON.parse(arrayLiteral);
  };

  return [...takeArray("ExpectedQueries"), ...takeArray("ExpectedMutations"), ...takeArray("ExpectedActions")];
}

function checkConvexEndpointsExist(repoRoot: string): void {
  const expected = readExpectedApiNames(repoRoot);
  if (expected.length === 0) {
    fail("No expected endpoints extracted from spec/contracts.generated.ts");
  }

  const missing: string[] = [];

  for (const fullName of expected) {
    const [moduleName, fnName] = fullName.split(".");
    if (!moduleName || !fnName) {
      missing.push(fullName);
      continue;
    }

    const modulePath = path.join(repoRoot, "convex", `${moduleName}.ts`);
    if (!fs.existsSync(modulePath)) {
      missing.push(fullName);
      continue;
    }

    const src = fs.readFileSync(modulePath, "utf8");
    const re = new RegExp(`export\\s+(?:const|function)\\s+${fnName}\\b`);
    if (!re.test(src)) {
      missing.push(fullName);
    }
  }

  if (missing.length > 0) {
    fail(`Missing Convex endpoints (per spec/CONTRACTS.md):\n- ${missing.join("\n- ")}`);
  }
}

function checkNoSecretLeak(repoRoot: string): void {
  const forbidden = "turnstileSecretKey";
  const scanRoots = [
    path.join(repoRoot, "convex"),
    path.join(repoRoot, "src"),
    path.join(repoRoot, "app"),
  ].filter((p) => fs.existsSync(p));

  const hits: string[] = [];
  for (const root of scanRoots) {
    const files = walkFiles(root, {
      includeExts: [".ts", ".tsx", ".js", ".jsx", ".md", ".json"],
      ignoreDirs: ["node_modules", "_generated", ".next", ".git"],
    });

    for (const f of files) {
      const txt = fs.readFileSync(f, "utf8");
      const rel = path.relative(repoRoot, f).replace(/\\/g, "/");

      if (rel.startsWith("convex/") && rel.endsWith(".ts")) {
        const logVerdict = checkNoSecretInLogs(rel, txt);
        if (!logVerdict.ok) {
          hits.push(`${rel} — ${logVerdict.reason}`);
          continue;
        }
      }

      if (txt.includes(forbidden)) {
        const verdict = isAllowedTurnstileUsage(rel, txt);
        if (!verdict.allowed) {
          hits.push(`${rel} — ${verdict.reason}`);
        }
      }
    }
  }

  if (hits.length > 0) {
    fail(`Secret leak: \"${forbidden}\" found in forbidden locations:\n- ${hits.join("\n- ")}`);
  }
}

function main(): void {
  const repoRoot = process.cwd();

  checkGeneratedUpToDate(repoRoot);
  checkConvexEndpointsExist(repoRoot);
  checkNoSecretLeak(repoRoot);

  console.log("contracts:check OK");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
