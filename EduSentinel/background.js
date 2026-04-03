// ============================================================
// EduSentinel AI — background.js (FINAL FIXED + CLOUD)
// ============================================================

importScripts("phishing_detector.js");

// ── Config ──────────────────────────────────────────────────
const API_KEY = "YOUR_API_KEY";

const SAFE_BROWSING_URL =
  `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${API_KEY}`;

const THRESHOLD_DANGEROUS  = 0.8;
const THRESHOLD_UNVERIFIED = 0.4;

// ================= FIREBASE CONFIG =================
const FIREBASE_DB_URL = "https://edusentinel-d8a73-default-rtdb.firebaseio.com/phishing_urls";

// ============================================================
// 🔥 FIXED FIREBASE MATCHING (_ format support)
// ============================================================
async function checkFirebase(url) {
  try {
    const res  = await fetch(`${FIREBASE_DB_URL}.json`);
    const data = await res.json();

    if (!data || typeof data !== "object") return false;

    const hostname = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    const formatted = hostname.replace(/\./g, "_");

    for (const key of Object.keys(data)) {
      if (formatted === key.toLowerCase()) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

async function saveToFirebase(domain) {
  try {
    await fetch(`${FIREBASE_DB_URL}/${domain}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(true),
    });
  } catch {}
}

// ============================================================
//  TRUSTED DOMAIN CACHE
// ============================================================
let trustedDomains = new Set();

(async () => {
  try {
    const url  = chrome.runtime.getURL("trusted-domains.json");
    const res  = await fetch(url);
    const list = await res.json();
    if (Array.isArray(list)) {
      trustedDomains = new Set(list.map(d => d.toLowerCase().trim()));
    }
  } catch {}
})();

// ============================================================
//  TRUST CHECK HELPER
// ============================================================
function isTrustedUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return (
      trustedDomains.has(hostname) ||
      [...trustedDomains].some(d => hostname === d || hostname.endsWith("." + d))
    );
  } catch {
    return false;
  }
}

// ============================================================
//  BLOCK FUNCTION
// ============================================================
function blockDangerousTab(tabId, url, reason) {
  const warningPage = chrome.runtime.getURL("warning.html")
    + "?url=" + encodeURIComponent(url)
    + "&reason=" + encodeURIComponent(reason);

  chrome.tabs.update(tabId, { url: warningPage });
}

// ============================================================
//  webNavigation Listener
// ============================================================
chrome.webNavigation.onCommitted.addListener(({ tabId, url, frameId }) => {
  if (frameId !== 0) return;
  if (!url) return;

  if (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("devtools://") ||
    url.startsWith("about:") ||
    url.startsWith("data:")
  ) return;

  analyzeUrl(url, tabId);
});

// ============================================================
//  ADDITIONAL TRIGGER
// ============================================================
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;

  const url = tab.url;
  if (!url) return;

  if (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("devtools://") ||
    url.startsWith("about:") ||
    url.startsWith("data:")
  ) return;

  analyzeUrl(url, tabId);
});

// ============================================================
// Message Router
// ============================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === "GET_TAB_ID") {
    sendResponse({ tabId: sender.tab?.id });
    return true;
  }

  if (message.type === "ANALYZE_URL") {
    const url   = message.url;
    const tabId = sender.tab?.id;

    if (url && tabId) {
      analyzeUrl(url, tabId);
    }

    return true;
  }
});

// ============================================================
// Core Analysis Pipeline
// ============================================================
async function analyzeUrl(url, tabId) {

  const domain = new URL(url).hostname.replace(/^www\./, "");

  //  CLOUD CHECK
  if (await checkFirebase(url)) {
    blockDangerousTab(tabId, url, "Blocked by cloud intelligence");
    return;
  }

  //  TRUSTED DOMAIN
  if (isTrustedUrl(url)) {
    const result = {
      verdict: "SAFE",
      score: 0,
      reasons: ["Trusted domain — skipped AI analysis"],
      inferenceMs: 0
    };

    chrome.storage.local.set({ ["tab_" + tabId]: result });

    chrome.runtime.sendMessage({
      type: "ANALYSIS_RESULT",
      tabId,
      result
    }, () => {
      if (chrome.runtime.lastError) return;
    });

    return;
  }

  const startTime = performance.now();

  const [aiResult, safeBrowsingResult] = await Promise.all([
    runAiModel(url),
    checkSafeBrowsing(url),
  ]);

  aiResult.url = url;

  const inferenceMs = Math.round(performance.now() - startTime);
  const result = buildVerdict(aiResult, safeBrowsingResult, inferenceMs);

  if (result.verdict === "DANGEROUS") {
    blockDangerousTab(tabId, url, result.reasons[0] || "Threat detected");

    // ❌ AUTO LEARNING OFF
    // saveToFirebase(domain);
  }

  chrome.storage.local.set({ ["tab_" + tabId]: result });

  chrome.runtime.sendMessage(
    { type: "ANALYSIS_RESULT", tabId, result },
    () => {
      if (chrome.runtime.lastError) return;
    }
  );
}

// ============================================================
// AI Model
// ============================================================
async function runAiModel(url) {
  try {
    const result = predict(url);

    return {
      probability: result.probability ?? 0,
      isPhishing:  result.isPhishing === true,
      label:       result.label ?? "benign",
    };
  } catch {
    return { probability: 0, isPhishing: false, label: "error" };
  }
}

// ============================================================
// Safe Browsing
// ============================================================
async function checkSafeBrowsing(url) {
  const body = {
    client: {
      clientId: "edusentinel-ai",
      clientVersion: "1.0.0",
    },
    threatInfo: {
      threatTypes: [
        "MALWARE",
        "SOCIAL_ENGINEERING",
        "UNWANTED_SOFTWARE",
        "POTENTIALLY_HARMFUL_APPLICATION",
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url }],
    },
  };

  try {
    const res = await fetch(SAFE_BROWSING_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return { isMalicious: false, threatType: null };
    }

    const data = await res.json();

    if (data.matches && data.matches.length > 0) {
      return {
        isMalicious: true,
        threatType: data.matches[0].threatType || "UNKNOWN",
      };
    }

    return { isMalicious: false, threatType: null };

  } catch {
    return { isMalicious: false, threatType: null };
  }
}

// ============================================================
// Verdict
// ============================================================
function buildVerdict(aiResult, safeBrowsingResult, inferenceMs) {
  const { probability, isPhishing, url = "" } = aiResult;
  const { isMalicious, threatType } = safeBrowsingResult;

  let verdict;
  const reasons = [];

  if (isMalicious) {
    verdict = "DANGEROUS";
    reasons.push(" Google has flagged this website as harmful — do not proceed.");
    reasons.push("This site may be trying to steal your information or install malware.");
  }

  else if (probability > 0.95) {
    verdict = "DANGEROUS";
    reasons.push(" This link seems highly suspicious and may not be what it claims to be.");
    reasons.push("For your safety, avoid sharing any personal or login information.");
  }

  else if (isPhishing || probability > 0.5) {
    verdict = "UNVERIFIED";
    reasons.push(` This link looks unusual  (${Math.round(probability * 100)}% risk).`);

    if (url.length > 75) {
      reasons.push("his link looks a bit unusual and not like a typical trusted website.");
    }

    if ((url.match(/\./g) || []).length > 3) {
      reasons.push("The web address is difficult to understand, so it's better to be careful.");
    }

    if ((url.match(/\d/g) || []).length > 5) {
      reasons.push("There are a lot of numbers in this link — real websites usually don't look like this.");
    }

    if (url.includes("@")) {
      reasons.push("This link includes unusual patterns that can be misleading..");
    }

    if (!url.startsWith("https")) {
      reasons.push("This site is not secure (no HTTPS lock).");
    }

    if ((url.match(/[@\-_%=&]/g) || []).length > 3) {
      reasons.push("This link contains unusual symbols — it may not be trustworthy.");
    }

    if (reasons.length === 1) {
      reasons.push("Overall, this link doesn't feel completely reliable.");
    }
  }

  else {
    verdict = "SAFE";
    reasons.push(" This website looks safe to visit.");
    reasons.push("No major security risks were detected. You can continue safely.");
  }

  return {
    verdict,
    score: probability,
    reasons,
    inferenceMs,
  };
}