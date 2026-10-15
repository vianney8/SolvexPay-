#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Keep dependency installs reproducible and portable to external hosts.
node --input-type=module <<'NODE'
import { readFileSync } from "node:fs";
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const internal = Object.values(lock.packages ?? {}).some(
  entry => entry.resolved && new URL(entry.resolved).hostname.endsWith(".internal"),
);
if (internal) {
  console.error("Le lockfile contient une adresse interne inaccessible aux hébergeurs externes. Corrigez les URL en préservant les versions et leur intégrité.");
  process.exit(1);
}
NODE

npm ci --include=dev --no-audit --no-fund
npm run check
npm run build

# No schema changes, payment requests or administrative setting changes here.
