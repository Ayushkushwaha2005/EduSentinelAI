/*
 * Privacy promise, machine-enforced (SECURITY-ROADMAP §8.3): the built
 * output must contain no third-party tracker/analytics hosts. "No
 * third-party trackers" is a public claim on our marketing pages — this
 * turns it into an invariant CI enforces instead of a sentence we hope
 * stays true.
 *
 * Matching is hostname-anchored: the host must be preceded by a URL/quote
 * boundary and not followed by a word character, so identifiers like
 * `_segment.computeX` in framework code are not false positives. Only the
 * production build is scanned (.next/dev is local scratch output).
 */
import { readdir, readFile } from "fs/promises";
import path from "path";

const NEXT_DIR = path.join(process.cwd(), "apps", "web", ".next");
const SKIP_DIRS = new Set(["dev", "cache"]);

const BLOCKED = [
  "google-analytics.com",
  "googletagmanager.com",
  "doubleclick.net",
  "connect.facebook.net",
  "hotjar.com",
  "cdn.segment.com",
  "api.segment.io",
  "mixpanel.com",
  "amplitude.com",
  "fullstory.com",
  "clarity.ms",
  "intercom.io",
];

const patterns = BLOCKED.map((host) => ({
  host,
  re: new RegExp(`(?:https?:)?//(?:[a-z0-9-]+\\.)*${host.replace(/\./g, "\\.")}(?![\\w.-])`, "i"),
}));

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* files(path.join(dir, entry.name));
    } else if (/\.(js|html|css)$/.test(entry.name)) {
      yield path.join(dir, entry.name);
    }
  }
}

const hits = [];
for await (const file of files(NEXT_DIR)) {
  const text = await readFile(file, "utf8");
  for (const { host, re } of patterns) {
    if (re.test(text)) hits.push(`${host} → ${path.relative(NEXT_DIR, file)}`);
  }
}

if (hits.length) {
  console.error("Third-party trackers found in production build output:");
  for (const h of hits) console.error("  " + h);
  console.error("\nThis violates the platform's no-tracker privacy commitment.");
  process.exit(1);
}
console.log("check-trackers: clean — no third-party trackers in production build.");
