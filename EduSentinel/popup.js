// ============================================================
// popup.js — EduSentinel AI  (type="module")
// LOGIC ONLY — UI structure is untouched.
//
// Mapped to actual popup.html element IDs:
//   #riskValue       → risk percentage text  (e.g. "73%")
//   #threatLevel     → threat label          (e.g. "Threat: DANGEROUS")
//   #inferenceTime   → inference timing      (e.g. "Inference: 4 ms")
//   #progress        → SVG circle stroke-dashoffset
//   #explanationBox  → collapsible reasons list
//   #toggleDetails   → button to show/hide explanation
//   #aiToggle        → enable/disable AI scanning
//   #whiteModeToggle → White Browsing mode switch
//   #emojiLock       → opens PIN modal
//   #emojiPinModal   → PIN modal container
//   #emojiPinInput   → PIN input field
//   #emojiCancel     → cancel modal
//   #emojiSubmit     → submit PIN
//   #modeStatus      → mode status label
// ============================================================

"use strict";

// ── SVG RING CONSTANTS ────────────────────────────────────────
// The <circle> in popup.html has r="50", so circumference = 2π × 50 ≈ 314
const CIRCUMFERENCE = 314;

// ── VERDICT COLOR MAP ─────────────────────────────────────────
const VERDICT_COLORS = {
  SAFE      : "#00ff88",   // green  (matches existing CSS accent)
  UNVERIFIED: "#f59e0b",   // amber
  DANGEROUS : "#ef4444",   // red
  SCANNING  : "#00a3ff",   // blue  (loading state)
};

// ── VERDICT LABELS ─────────────────────────────────────────────
const VERDICT_LABELS = {
  SAFE      : " SAFE",
  UNVERIFIED: " UNVERIFIED",
  DANGEROUS : " DANGEROUS",
  SCANNING  : " Scanning…",
};

// ── STORAGE KEY HELPER ────────────────────────────────────────
function tabKey(tabId) {
  return `tab_${tabId}`;
}

// ─────────────────────────────────────────────────────────────
// UI UPDATER
// Accepts a result object and pushes all values into the
// existing popup elements with smooth transitions.
// ─────────────────────────────────────────────────────────────
function updateUI(result) {
  const {
    verdict     = "SAFE",
    score       = 0,
    reasons     = [],
    inferenceMs = 0,
  } = result;

  const pct    = Math.round(score * 100);
  const color  = VERDICT_COLORS[verdict] ?? VERDICT_COLORS.SAFE;
  const label  = VERDICT_LABELS[verdict] ?? VERDICT_LABELS.SAFE;

  // ── Risk percentage text ──────────────────────────────────
  const riskValue = document.getElementById("riskValue");
  if (riskValue) riskValue.textContent = `${pct}%`;

  // ── Threat level label ────────────────────────────────────
  const threatLevel = document.getElementById("threatLevel");
  if (threatLevel) {
    threatLevel.textContent = `Threat: ${label}`;
    threatLevel.style.color = color;
  }

  // ── Inference time ────────────────────────────────────────
  const inferenceEl = document.getElementById("inferenceTime");
  if (inferenceEl) {
    inferenceEl.textContent =
      inferenceMs > 0 ? `Inference: ${inferenceMs} ms` : "Inference: -- ms";
  }

  // ── SVG progress ring ─────────────────────────────────────
  // stroke-dashoffset: 314 = 0%, 0 = 100%
  const progress = document.getElementById("progress");
  if (progress) {
    const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;
    progress.style.strokeDashoffset = offset;
    progress.style.stroke           = color;
  }

  // ── Explanation box ───────────────────────────────────────
  const explanationBox = document.getElementById("explanationBox");
  if (explanationBox && reasons.length) {
    explanationBox.innerHTML = reasons
      .map((r) => `<p style="margin:4px 0;font-size:11px;opacity:0.9;">• ${r}</p>`)
      .join("");
  }
}


// ─────────────────────────────────────────────────────────────
// LOAD RESULT FROM STORAGE FOR ACTIVE TAB
// ─────────────────────────────────────────────────────────────
async function loadCurrentTabResult() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  // Show scanning state while we wait
  updateUI({ verdict: "SCANNING", score: 0, reasons: ["Analyzing page…"], inferenceMs: 0 });

  const key    = tabKey(tab.id);
  const stored = await chrome.storage.local.get(key);
  const result = stored[key];

  if (result) {
    updateUI(result);
  } else {
    // No result yet — page may not have a content script result.
    // Show a neutral state.
    updateUI({
      verdict    : "SAFE",
      score      : 0,
      reasons    : ["No analysis data available for this page."],
      inferenceMs: 0,
    });
  }

  return tab.id;
}


// ─────────────────────────────────────────────────────────────
// LIVE UPDATE LISTENER
// If background.js pushes a new result while popup is open,
// re-render immediately (no reload needed).
// ─────────────────────────────────────────────────────────────
function listenForLiveUpdates(activeTabId) {
  chrome.runtime.onMessage.addListener((message) => {
    if (
      message.type   === "ANALYSIS_RESULT" &&
      message.tabId  === activeTabId
    ) {
      updateUI(message.result);
    }
  });
}


// ─────────────────────────────────────────────────────────────
// AI ENGINE TOGGLE
// Persists preference to chrome.storage.local.
// When disabled, UI shows a "paused" state.
// ─────────────────────────────────────────────────────────────
function initAIToggle() {
  const toggle = document.getElementById("aiToggle");
  if (!toggle) return;

  // Restore saved state
  chrome.storage.local.get("aiEnabled", ({ aiEnabled }) => {
    toggle.checked = aiEnabled !== false;   // default ON
  });

  toggle.addEventListener("change", () => {
    chrome.storage.local.set({ aiEnabled: toggle.checked });

    if (!toggle.checked) {
      updateUI({
        verdict    : "SAFE",
        score      : 0,
        reasons    : ["AI Engine is disabled. Enable to start scanning."],
        inferenceMs: 0,
      });
    }
  });
}


// ─────────────────────────────────────────────────────────────
// EXPLANATION TOGGLE BUTTON
// ─────────────────────────────────────────────────────────────
function initExplanationToggle() {
  const btn = document.getElementById("toggleDetails");
  const box = document.getElementById("explanationBox");
  if (!btn || !box) return;

  btn.addEventListener("click", () => {
    const isHidden = box.classList.contains("hidden");
    box.classList.toggle("hidden", !isHidden);
    btn.textContent = isHidden ? "Hide Explanation" : "View Explanation";
  });
}


// ─────────────────────────────────────────────────────────────
// WHITE BROWSING MODE
// ─────────────────────────────────────────────────────────────
function initWhiteBrowsingMode() {
  const toggle    = document.getElementById("whiteModeToggle");
  const modeStatus = document.getElementById("modeStatus");
  if (!toggle || !modeStatus) return;

  // Restore saved state
  chrome.storage.local.get("whiteMode", ({ whiteMode }) => {
    toggle.checked      = !!whiteMode;
    modeStatus.textContent = whiteMode
      ? " Enforcement mode active — non-educational sites blocked."
      : " Focus mode — monitoring only.";
  });

  toggle.addEventListener("change", () => {
    const active = toggle.checked;
    chrome.storage.local.set({ whiteMode: active });
    modeStatus.textContent = active
      ? " Enforcement mode active — non-educational sites blocked."
      : " Focus mode — monitoring only.";
  });
}


// ─────────────────────────────────────────────────────────────
// EMOJI PIN MODAL
// Protects Enforcement mode from accidental toggling.
// PIN is stored (hashed-ish via simple comparison) in storage.
// ─────────────────────────────────────────────────────────────
function initEmojiPinModal() {
  const lockBtn    = document.getElementById("emojiLock");
  const modal      = document.getElementById("emojiPinModal");
  const pinInput   = document.getElementById("emojiPinInput");
  const cancelBtn  = document.getElementById("emojiCancel");
  const submitBtn  = document.getElementById("emojiSubmit");
  const modeStatus = document.getElementById("modeStatus");

  if (!lockBtn || !modal || !pinInput || !cancelBtn || !submitBtn) return;

  // Default PIN (4 digits). User can change via storage directly for now.
  const DEFAULT_PIN = "1234";

  function openModal() {
    modal.classList.remove("hidden");
    pinInput.value = "";
    pinInput.focus();
  }

  function closeModal() {
    modal.classList.add("hidden");
    pinInput.value = "";
  }

  lockBtn.addEventListener("click", openModal);
  cancelBtn.addEventListener("click", closeModal);

  submitBtn.addEventListener("click", () => {
    chrome.storage.local.get("sentinelPIN", ({ sentinelPIN }) => {
      const correctPIN = sentinelPIN || DEFAULT_PIN;

      if (pinInput.value === correctPIN) {
        // Correct PIN — toggle enforcement off
        chrome.storage.local.set({ whiteMode: false });
        const whiteModeToggle = document.getElementById("whiteModeToggle");
        if (whiteModeToggle) whiteModeToggle.checked = false;
        if (modeStatus) modeStatus.textContent = "👁️ Focus mode — monitoring only.";
        closeModal();
      } else {
        pinInput.style.borderColor = "#ef4444";
        pinInput.value             = "";
        pinInput.placeholder       = "Wrong PIN — try again";
        setTimeout(() => {
          pinInput.style.borderColor = "";
          pinInput.placeholder       = "Enter PIN";
        }, 1500);
      }
    });
  });

  // Allow Enter key to submit PIN
  pinInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitBtn.click();
  });

  // Close modal on backdrop click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
}
// ─────────────────────────────────────────────────────────────
// PASSWORD PROTECTION TOGGLE
// ─────────────────────────────────────────────────────────────
function initPasswordProtectionToggle() {
  const toggle = document.getElementById("passwordProtectionToggle");
  const status = document.getElementById("passwordProtectionStatus");
  if (!toggle || !status) return;

  // Restore saved state — default ON
  chrome.storage.local.get("passwordProtectionEnabled", ({ passwordProtectionEnabled }) => {
    const enabled      = passwordProtectionEnabled !== false;
    toggle.checked     = enabled;
    status.textContent = enabled
      ? "Password Protection: Enabled"
      : "Password Protection: Disabled";
  });

  toggle.addEventListener("change", () => {
    const enabled = toggle.checked;
    chrome.storage.local.set({ passwordProtectionEnabled: enabled });
    status.textContent = enabled
      ? "Password Protection: Enabled"
      : "Password Protection: Disabled";
  });
}

// ─────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // Boot all feature modules
  initAIToggle();
  initExplanationToggle();
  initWhiteBrowsingMode();
  initEmojiPinModal();
  initPasswordProtectionToggle();

  // Load analysis result for the currently active tab
  const tabId = await loadCurrentTabResult();

  // Keep popup live — re-render if background sends a new result
  if (tabId) listenForLiveUpdates(tabId);
});