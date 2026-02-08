#!/usr/bin/env node
/**
 * Pre-commit hook: fail if staged files contain patterns that look like secrets.
 * Run: node scripts/check-secrets.mjs
 */
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const PATTERNS = [
  { name: "OpenAI API key", regex: /sk-[a-zA-Z0-9]{20,}/ },
  { name: "Generic API key", regex: /(?:api[_-]?key|apikey)\s*=\s*["']?[a-zA-Z0-9_\-]{20,}/i },
  { name: "Bearer token", regex: /Bearer\s+[a-zA-Z0-9_\-.]{20,}/ },
  { name: "Password in assignment", regex: /(?:password|passwd|secret)\s*=\s*["'][^"']{8,}["']/i },
  { name: "Private key block", regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
];

function getStagedFiles() {
  try {
    const out = execSync("git diff --cached --name-only --diff-filter=ACMR", { encoding: "utf-8" });
    return out
      .trim()
      .split("\n")
      .filter(Boolean)
      .filter((f) => !/^\s*#/.test(f));
  } catch {
    return [];
  }
}

function checkFile(filePath) {
  const fullPath = resolve(process.cwd(), filePath);
  if (!existsSync(fullPath)) return [];
  let content;
  try {
    content = readFileSync(fullPath, "utf-8");
  } catch {
    return [];
  }
  const hits = [];
  for (const { name, regex } of PATTERNS) {
    const m = content.match(regex);
    if (m) hits.push({ file: filePath, name, match: m[0].slice(0, 30) + "..." });
  }
  return hits;
}

const staged = getStagedFiles();
const allHits = [];
for (const f of staged) {
  allHits.push(...checkFile(f));
}

if (allHits.length > 0) {
  console.error("git-secrets check failed: possible secrets in staged files:\n");
  for (const { file, name, match } of allHits) {
    console.error(`  ${file}: ${name} (e.g. ${match})`);
  }
  console.error("\nRemove secrets from staged files or add to .gitignore.");
  process.exit(1);
}
