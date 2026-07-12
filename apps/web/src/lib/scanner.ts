import { execFile } from "child_process";
import { promisify } from "util";

const exec = promisify(execFile);

export type ScanResult = { status: "CLEAN" | "FLAGGED" | "NO_SCANNER"; detail: string };

/*
 * Malware scanning adapter (R5). Uses whatever is configured:
 *  1. VirusTotal (VIRUSTOTAL_API_KEY) — hash lookup, defense-in-depth
 *  2. Local ClamAV (clamscan on PATH)
 * With neither available the artifact reports NO_SCANNER and stays in
 * quarantine — human founder review is required for every release either
 * way, and doubly so without automated scanning (SN-005).
 */
export async function scanArtifact(filePath: string, sha256: string): Promise<ScanResult> {
  const vtKey = process.env.VIRUSTOTAL_API_KEY;
  if (vtKey) {
    try {
      const res = await fetch(`https://www.virustotal.com/api/v3/files/${sha256}`, {
        headers: { "x-apikey": vtKey },
      });
      if (res.status === 404) {
        return { status: "CLEAN", detail: "virustotal: hash unknown (no detections on record)" };
      }
      if (res.ok) {
        const data = (await res.json()) as {
          data?: { attributes?: { last_analysis_stats?: { malicious?: number; suspicious?: number } } };
        };
        const stats = data.data?.attributes?.last_analysis_stats;
        const bad = (stats?.malicious ?? 0) + (stats?.suspicious ?? 0);
        return bad > 0
          ? { status: "FLAGGED", detail: `virustotal: ${bad} engines flagged` }
          : { status: "CLEAN", detail: "virustotal: 0 detections" };
      }
    } catch (err) {
      console.error("[scanner] virustotal failed:", err);
    }
  }

  try {
    const { stdout } = await exec("clamscan", ["--no-summary", filePath], {
      timeout: 120_000,
    });
    return { status: "CLEAN", detail: `clamscan: ${stdout.trim().slice(0, 200)}` };
  } catch (err) {
    const e = err as { code?: number; stdout?: string };
    if (e.code === 1) {
      return { status: "FLAGGED", detail: `clamscan: ${(e.stdout ?? "").trim().slice(0, 200)}` };
    }
    // clamscan not installed / other failure
  }

  return { status: "NO_SCANNER", detail: "no scanner configured — manual review mandatory" };
}
