#!/usr/bin/env node
/**
 * Keeps the golden fixtures identical across both engine ports.
 *
 * The TypeScript and Swift engines are only guaranteed to agree because both
 * test suites assert against the *same* fixtures. SwiftPM resources must live
 * inside the test target, so the files are physically duplicated — and nothing
 * but this check stops the two copies from drifting apart silently.
 *
 *   node scripts/check-fixtures.mjs           report drift, exit 1
 *   node scripts/check-fixtures.mjs --write   copy TS -> Swift
 *
 * src/game/fixtures is canonical: fixtures are authored there alongside
 * golden.test.ts.
 */
import { readdirSync, readFileSync, copyFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const CANONICAL = "src/game/fixtures";
const MIRROR = "swift/Tests/NineToesEngineTests/Fixtures";
const write = process.argv.includes("--write");

const jsonIn = (dir) => {
  try {
    return readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error(`✗ missing fixture directory: ${dir}`);
      process.exit(1);
    }
    throw err;
  }
};

const canonical = jsonIn(CANONICAL);
const mirror = jsonIn(MIRROR);

const missing = canonical.filter((f) => !mirror.includes(f));
const extra = mirror.filter((f) => !canonical.includes(f));
const differing = canonical
  .filter((f) => mirror.includes(f))
  .filter((f) => !readFileSync(join(CANONICAL, f)).equals(readFileSync(join(MIRROR, f))));

if (!missing.length && !extra.length && !differing.length) {
  console.log(`✓ ${canonical.length} golden fixtures in sync (${CANONICAL} ↔ ${MIRROR})`);
  process.exit(0);
}

if (write) {
  for (const f of [...missing, ...differing]) {
    copyFileSync(join(CANONICAL, f), join(MIRROR, f));
    console.log(`  copied  ${f}`);
  }
  for (const f of extra) {
    rmSync(join(MIRROR, f));
    console.log(`  removed ${f}  (not in ${CANONICAL})`);
  }
  console.log(`\n✓ synced ${MIRROR} to match ${CANONICAL}`);
  console.log("  Re-run `swift test` to confirm the Swift engine still agrees.");
  process.exit(0);
}

console.error("✗ golden fixtures have drifted between the TS and Swift engines\n");
for (const f of missing) console.error(`  missing from Swift   ${f}`);
for (const f of extra) console.error(`  only in Swift        ${f}`);
for (const f of differing) console.error(`  contents differ      ${f}`);
console.error(
  "\nBoth test suites must assert against identical fixtures, or the two engine" +
    "\nports can diverge without any test failing.\n" +
    `\n  npm run sync:fixtures     copy ${CANONICAL} -> ${MIRROR}` +
    `\n  diff -r ${CANONICAL} ${MIRROR}` +
    "\n\nIf the Swift copy is the one you meant to keep, copy it back by hand —" +
    "\n--write always treats the TypeScript directory as canonical.",
);
process.exit(1);
