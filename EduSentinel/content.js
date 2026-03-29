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

// Auto-run on page load
(function () {
  analyze();
})();

// Main function
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