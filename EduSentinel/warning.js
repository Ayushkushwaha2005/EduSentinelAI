// ============================================================
// EduSentinel AI — warning.js
// ============================================================

const params     = new URLSearchParams(window.location.search);
const blockedUrl = params.get("url")    || "Unknown URL";
const reason     = params.get("reason") || "This website was flagged as a phishing threat.";

// ── Blocking authority flag ───────────────────────────────────
const isBlocked  = params.has("reason");

document.getElementById("blocked-url").textContent = blockedUrl;
document.getElementById("reason-text").textContent = reason;

// ── Go Back ──────────────────────────────────────────────────
function goBack() {
  if (history.length > 1) {
    history.back();
  } else {
    window.location.href = "chrome://newtab";
  }
}

// ── Proceed Anyway ───────────────────────────────────────────
function proceedAnyway() {
  if (blockedUrl && blockedUrl !== "Unknown URL") {
    window.location.href = blockedUrl;
  }
}

document.getElementById("btn-go-back").addEventListener("click", goBack);
document.getElementById("btn-proceed").addEventListener("click", proceedAnyway);

// ── AI Panel: block-decision takes final authority ────────────
if (isBlocked) {
  document.addEventListener("DOMContentLoaded", () => {
    enforceBlockedState();
  });

  // Also observe for late/async AI panel renders
  const observer = new MutationObserver(() => {
    enforceBlockedState();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function enforceBlockedState() {
  // Override any safety label text the AI panel may have set
  const safePatterns = /safe|legitimate|trusted|secure/i;

  document.querySelectorAll(
    "[class*='status'], [class*='label'], [class*='result'], [class*='verdict'], [id*='status'], [id*='label'], [id*='result'], [id*='verdict']"
  ).forEach(el => {
    if (safePatterns.test(el.textContent)) {
      el.textContent = el.textContent.replace(/safe|legitimate|trusted|secure/gi, "DANGEROUS");
    }
  });

  // Override percentage/score if AI rated it safe (>= 50% safe → flip to dangerous)
  document.querySelectorAll(
    "[class*='score'], [class*='percent'], [id*='score'], [id*='percent']"
  ).forEach(el => {
    const val = parseFloat(el.textContent);
    if (!isNaN(val) && val >= 50) {
      el.textContent = el.textContent.replace(/[\d.]+/, (100 - val).toFixed(1));
    }
  });

  // Force any color/class that signals "safe" to dangerous styling
  document.querySelectorAll(".safe, .is-safe, .status-safe, .verdict-safe").forEach(el => {
    el.classList.remove("safe", "is-safe", "status-safe", "verdict-safe");
    el.classList.add("dangerous", "is-dangerous", "status-dangerous", "verdict-dangerous");
  });
}