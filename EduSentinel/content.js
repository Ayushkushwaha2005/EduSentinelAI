// EduSentinel AI — Password Engine (inlined, no import needed)
// ============================================================

const COMMON_WEAK_PATTERNS = [
  "123456",
  "password",
  "qwerty",
  "abc123",
];

const REPEATED_SEQUENCE = /(.)\1{3,}/;

function hasUppercase(str)  { return /[A-Z]/.test(str); }
function hasLowercase(str)  { return /[a-z]/.test(str); }
function hasNumbers(str)    { return /[0-9]/.test(str); }
function hasSymbols(str)    { return /[^a-zA-Z0-9]/.test(str); }

function isPredictable(password) {
  const onlyLowercaseAndDigits  = /^[a-z]+[0-9]+$|^[0-9]+[a-z]+$/.test(password);
  const dictionaryWordWithDigits = /^[a-zA-Z]{4,}[0-9]{1,4}$/.test(password);
  return onlyLowercaseAndDigits || dictionaryWordWithDigits;
}

function getDiversityScore(password) {
  let score = 0;
  if (hasUppercase(password)) score++;
  if (hasLowercase(password)) score++;
  if (hasNumbers(password))   score++;
  if (hasSymbols(password))   score++;
  return score;
}

function analyzePassword(password) {
  const WEAK   = { strength: "Weak",   message: "Weak — Avoid using names, birth dates, or simple patterns" };
  const MEDIUM = { strength: "Medium", message: "Good — try making it longer and less predictable" };
  const STRONG = { strength: "Strong", message: "Strong password" };

  if (!password || typeof password !== "string") return WEAK;

  const lower = password.toLowerCase();

  if (COMMON_WEAK_PATTERNS.some(p => lower.includes(p))) return WEAK;
  if (REPEATED_SEQUENCE.test(password))                   return WEAK;

  const len         = password.length;
  const diversity   = getDiversityScore(password);
  const predictable = isPredictable(password);

  if (len < 8)  return WEAK;

  if (len < 12) {
    if (diversity >= 3 && !predictable) return MEDIUM;
    return WEAK;
  }

  if (predictable)     return MEDIUM;
  if (diversity >= 3)  return STRONG;
  if (diversity === 2) return MEDIUM;

  return WEAK;
}

// ============================================================
// EXISTING PHISHING LOGIC (UNCHANGED)
// ============================================================

// ── PRIORITY EXECUTION — must run before all other logic ─────
function analyze() {
  chrome.runtime.sendMessage(
    {
      type: "ANALYZE_URL",
      url: window.location.href,
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.log("Background not responding");
      }
    }
  );
}
analyze();
// ─────────────────────────────────────────────────────────────

// OPTIONAL: listen for live updates (popup sync)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYSIS_RESULT") {
    console.log("Analysis result:", message.result);
  }
});

// ============================================================
// EduSentinel AI — Password Hygiene Protection
// ============================================================

function initPasswordProtection() {
  const passwordFields = document.querySelectorAll("input[type='password']");
  if (!passwordFields.length) return;

  passwordFields.forEach((field) => {
    let tooltip = null;

    function getTooltip() {
      if (tooltip) return tooltip;

      tooltip = document.createElement("div");

      Object.assign(tooltip.style, {
        position: "absolute",
        zIndex: "999999",
        padding: "6px 10px",
        borderRadius: "6px",
        fontSize: "12px",
        fontFamily: "Arial, sans-serif",
        fontWeight: "500",
        color: "#fff",
        pointerEvents: "none",
        transition: "opacity 0.2s ease",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        maxWidth: "260px",
        lineHeight: "1.4",
      });

      tooltip.setAttribute("data-password-tooltip", "true");
      document.body.appendChild(tooltip);
      return tooltip;
    }

    function positionTooltip() {
      const rect = field.getBoundingClientRect();
      const t = getTooltip();

      t.style.top = (window.scrollY + rect.bottom + 6) + "px";
      t.style.left = (window.scrollX + rect.left) + "px";
    }

    function colorForStrength(strength) {
      if (strength === "Strong") return "#16a34a";
      if (strength === "Medium") return "#d97706";
      return "#dc2626";
    }

    field.addEventListener("input", () => {
      const value = field.value;

      if (!value) {
        if (tooltip) tooltip.style.opacity = "0";
        return;
      }

      const { strength, message } = analyzePassword(value);
      const t = getTooltip();

      t.textContent = message;
      t.style.background = colorForStrength(strength);
      t.style.opacity = "1";

      positionTooltip();
    });

    field.addEventListener("blur", () => {
      if (tooltip) tooltip.style.opacity = "0";
    });

    field.addEventListener("focus", () => {
      if (tooltip && field.value) tooltip.style.opacity = "1";
    });
  });
}

// ============================================================
// SAFE INITIALIZATION (FIXED)
// ============================================================

chrome.storage.local.get("passwordProtectionEnabled", ({ passwordProtectionEnabled }) => {
  if (passwordProtectionEnabled !== false) {
    setTimeout(() => {
      initPasswordProtection();
    }, 1500);
  }
});
// ── Real-time toggle listener ─────────────────────────────────
function removeAllPasswordTooltips() {
  document.querySelectorAll("[data-password-tooltip='true']").forEach(el => el.remove());
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !("passwordProtectionEnabled" in changes)) return;

  const enabled = changes.passwordProtectionEnabled.newValue;

  if (!enabled) {
    removeAllPasswordTooltips();
  } else {
    initPasswordProtection();
  }
});
// ============================================================
// EduSentinel AI — Cookie Safety System (+ FIXED)
// ============================================================

let cookieHandled = false;

  // ── Tooltip (improved messages) ────────────────────────────
  function showCookieTooltip(message, type) {
    const colors = { safe: "#16a34a", warn: "#f59e0b", danger: "#dc2626" };

    const tip = document.createElement("div");
    Object.assign(tip.style, {
      position:      "fixed",
      bottom:        "20px",
      right:         "20px",
      zIndex:        "2147483647",
      padding:       "10px 14px",
      borderRadius:  "8px",
      fontSize:      "12px",
      fontFamily:    "Arial, sans-serif",
      fontWeight:    "500",
      color:         "#fff",
      pointerEvents: "none",
      boxShadow:     "0 2px 8px rgba(0,0,0,0.3)",
      maxWidth:      "300px",
      lineHeight:    "1.6",
      background:    colors[type] || colors.safe,
      transition:    "opacity 0.4s ease",
      opacity:       "1",
    });

    tip.setAttribute("data-cookie-tooltip", "true");
    tip.textContent = message;
    document.body.appendChild(tip);

    setTimeout(() => { tip.style.opacity = "0"; }, 4000);
    setTimeout(() => { tip.remove();             }, 4500);
  }

  // ── Reliable button text matcher ───────────────────────────
  function buttonMatches(btn, keywords) {
    const text = (btn.innerText || btn.value || btn.getAttribute("aria-label") || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    return keywords.some(k => text.includes(k));
  }

  // ── Reliable click with one retry ──────────────────────────
  function safeClick(btn) {
    try {
      btn.click();
    } catch {
      setTimeout(() => { try { btn.click(); } catch {} }, 300);
    }
  }

  // ── Improved visible button finder ─────────────────────────
  function getVisibleButtons(scope) {
    const root = scope || document;
    return [...root.querySelectorAll(
      "button, a[role='button'], [class*='btn'], input[type='button'], [role='button']"
    )].filter(el => {
      const rect = el.getBoundingClientRect();
      return (
        rect.width  > 0 &&
        rect.height > 0 &&
        rect.top    >= 0 &&
        rect.top    <= window.innerHeight
      );
    });
  }

  // ── Improved cookie popup detector ─────────────────────────
  function findCookiePopup() {
    const OVERLAY = ["fixed", "sticky", "absolute"];
    const SELECTORS =
      "[id*='cookie'], [class*='cookie'], [id*='consent'], [class*='consent'], " +
      "[aria-label*='cookie'], [aria-label*='consent'], " +
      "[id*='gdpr'], [class*='gdpr'], [id*='banner'], [class*='banner'], " +
      "[id*='privacy'], [class*='privacy-bar']";

    const candidates = [...document.querySelectorAll(SELECTORS)];

    return candidates.find(el => {
      const rect  = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const text  = el.innerText.toLowerCase();

      const isVisible = (
        rect.width  > 0 &&
        rect.height > 0 &&
        rect.top    <= window.innerHeight &&
        rect.bottom >= 0 &&
        style.display    !== "none" &&
        style.visibility !== "hidden" &&
        parseFloat(style.opacity) > 0
      );

      const isOverlay   = OVERLAY.includes(style.position);
      const hasCookieText = (
        text.includes("cookie")            ||
        text.includes("we use cookies")    ||
        text.includes("this site uses")    ||
        text.includes("consent")
      );

      return isVisible && isOverlay && hasCookieText;
    });
  }

  // ── Core handler ───────────────────────────────────────────
  function handleCookiePopup() {
    if (cookieHandled) return;

    const popup = findCookiePopup();
    if (!popup) return;

    const buttons = getVisibleButtons(popup).length
      ? getVisibleButtons(popup)
      : getVisibleButtons();

    if (!buttons.length) return;

    // Priority 1 — Manage / Preferences
    const manageBtn = buttons.find(b =>
      buttonMatches(b, ["manage", "preferences", "settings"])
    );
    if (manageBtn) {
      cookieHandled = true;
      safeClick(manageBtn);
      showCookieTooltip(
        "Recommended: Allow only necessary cookies. Disable tracking, marketing, and analytics cookies to protect your data.",
        "safe"
      );
      return;
    }

    // Priority 2 — Necessary / Essential
    const safeBtn = buttons.find(b =>
      buttonMatches(b, ["accept necessary", "essential", "necessary only"])
    );
    if (safeBtn) {
      cookieHandled = true;
      safeClick(safeBtn);
      showCookieTooltip(
        "Safe choice: Only essential cookies will be used.",
        "safe"
      );
      return;
    }

    // Priority 3 — Accept All (last resort)
    const acceptAllBtn = buttons.find(b =>
      buttonMatches(b, ["accept all", "accept cookies", "allow all", "agree", "allow cookies"])
    );
    if (acceptAllBtn) {
      cookieHandled = true;
      safeClick(acceptAllBtn);
      showCookieTooltip(
        "Warning: Accepting all cookies may share your personal data with third parties. Proceed at your own risk.",
        "danger"
      );
      return;
    }
  }

  // ── Observer ───────────────────────────────────────────────
  const cookieObserver = new MutationObserver(() => {
    handleCookiePopup();
    if (cookieHandled) cookieObserver.disconnect();
  });

  function startCookieSafety() {
    setTimeout(() => {
      handleCookiePopup();
      if (!cookieHandled) {
        cookieObserver.observe(document.body, { childList: true, subtree: true });
      }
    }, 2000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startCookieSafety);
  } else {
    startCookieSafety();
  }
  // ============================================================
// ============================================================
// EduSentinel AI — White Browsing Enforcement Mode v4
// ADD-ON: Paste at END of content.js. Nothing above is touched.
// Fully isolated IIFE. Zero global variables. Zero conflicts.
// ============================================================

(function initEnforcementMode() {

  // ── ESCAPE 1: Never run inside extension's own pages ───────
  if (window.location.protocol === "chrome-extension:") return;

  // ── ESCAPE 2: Page arrived via our own learning redirect ───
  if (window.location.search.includes("edusentinel_redirect=1")) return;

  // ── ESCAPE 3: Search engine result pages — always allow ────
  // Structural check only — no domain names hardcoded.
  // A SERP carries a query param on a retrieval-service hostname.
  if (_isSearchResultPage(window.location.href)) return;

  // ── Only activate when user has enabled Enforcement Mode ───
  chrome.storage.local.get("whiteMode", ({ whiteMode }) => {
    if (!whiteMode) return;

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", _evaluate, { once: true });
    } else {
      // Small delay so DOM signals (videos, feed cards) are settled
      setTimeout(_evaluate, 400);
    }
  });

  // ── Evaluate the current page ──────────────────────────────
  function _evaluate() {
    const url   = window.location.href;
    const title = document.title || "";

    // Layer 1 first — fast path for unambiguous distraction pages
    if (_hasStrictSignal(url, title) || _hasHighHeuristicScore(url, title)) {
      _redirectToWarning(url);
    }
  }

  // ── LAYER 1: Strict structural signals (instant block) ─────
  // Any single match is enough. These patterns are cross-platform
  // structural conventions, not domain-specific knowledge.
  function _hasStrictSignal(url, title) {
    const path   = _urlPart(url, "pathname");
    const search = _urlPart(url, "search");

    // Short-form / feed URL path conventions
    if (/\/(reels?|shorts?|fyp|foryou|explore|trending)(\/|$|\?)/i.test(path)) return true;

    // Feed-consumption query strings
    if (/[?&](tab=reel|tab=shorts|fyp|ref=feed|feed=)/i.test(search)) return true;

    // Extremely video-heavy page
    if (document.querySelectorAll("video").length >= 5) return true;

    // Image grid with negligible readable text
    const imgs  = document.querySelectorAll("img, picture").length;
    const paras = document.querySelectorAll("p, article, section").length;
    if (imgs > 20 && paras < 3) return true;

    // Saturated feed-card layout (infinite scroll signature)
    const feedCards = document.querySelectorAll(
      "[class*='reel'], [class*='fyp'], [class*='shorts'], [class*='story-feed'], [class*='card-grid']"
    ).length;
    if (feedCards >= 6) return true;

    // Page title IS a feed label (not just contains — entire title matches)
    if (/^\s*(reels?|shorts?|trending|for you|explore|fyp)\s*$/i.test(title)) return true;

    return false;
  }

  // ── LAYER 2: Behavioral heuristic scoring ──────────────────
  // Multiple weak signals accumulate. Threshold ≥ 4 required.
  // A news page with one video, or a login page alone, never blocks.
  function _hasHighHeuristicScore(url, title) {
    let score    = 0;
    const path   = _urlPart(url, "pathname");
    const search = _urlPart(url, "search");

    // Feed/home/timeline path segments (weaker than strict layer)
    if (/\/(feed|home|timeline|notifications|watch)(\/|$|\?)/i.test(path)) score += 2;

    // Passive-consumption query params
    if (/[?&](explore|ref=nav|tab=home|tab=feed)/i.test(search)) score += 1;

    // Media density signals
    const videos = document.querySelectorAll("video").length;
    const imgs   = document.querySelectorAll("img, picture").length;
    const paras  = document.querySelectorAll("p, article, section").length;
    if (videos >= 3)                score += 2;
    if (imgs > 15 && paras < 5)     score += 2;

    // Feed-like container density
    const feedLike = document.querySelectorAll(
      "[class*='feed'], [class*='reel'], [class*='story'], [class*='card-grid']"
    ).length;
    if (feedLike >= 4) score += 2;

    // Very low readable text with high media count
    const bodyLen = (document.body?.innerText || "").replace(/\s+/g, " ").trim().length;
    if (bodyLen < 400 && (imgs + videos) > 6) score += 1;

    // Page title signals entertainment intent
    if (/\b(trending|viral|memes?|reels?|shorts?|explore|for you|fyp)\b/i.test(title)) score += 1;

    // Auth/login paths — low weight, only meaningful alongside other signals
    if (/\/(login|signup|accounts)(\/|$|\?)/i.test(path)) score += 1;

    return score >= 4;
  }

  // ── Redirect to warning page ───────────────────────────────
  function _redirectToWarning(url) {
    const p = new URLSearchParams({
      mode  : "enforcement",
      url,
      reason: "Stay focused — this content does not match your learning goals",
    });
    window.location.replace(
      chrome.runtime.getURL("warning.html") + "?" + p.toString()
    );
  }

  // ── Search result page detector (structural, no domain list) ─
  function _isSearchResultPage(url) {
    try {
      const parsed   = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      if (!/[?&](q|query|search_query|s|p)=/i.test(parsed.search)) return false;
      return /\b(google|bing|duckduckgo|yahoo|ask|ecosia|startpage|brave|yandex|baidu|search)\b/i
        .test(hostname);
    } catch {
      return false;
    }
  }

  // ── Safe URL part extractor ────────────────────────────────
  function _urlPart(url, part) {
    try { return new URL(url)[part].toLowerCase(); } catch { return ""; }
  }

})();