// ============================================================
// EduSentinel AI — warning.js  v4
// ============================================================

// ── Read URL params immediately (synchronous, no DOM needed) ─
const params     = new URLSearchParams(window.location.search);
const blockedUrl = params.get("url")    || "Unknown URL";
const reason     = params.get("reason") || "This website was flagged as a phishing threat.";
const isBlocked      = params.has("reason");
const isEnforcement  = params.get("mode") === "enforcement";

// ── Single-fire guard — prevents any duplicate triggers ──────
let proceedFired = false;

// ============================================================
// Core UI setup
// ============================================================

function applyBaseUI() {
  const urlEl    = document.getElementById("blocked-url");
  const reasonEl = document.getElementById("reason-text");
  if (urlEl)    urlEl.textContent    = blockedUrl;
  if (reasonEl) reasonEl.textContent = reason;
}

// ============================================================
// Go Back
// ============================================================

function goBack() {
  if (history.length > 1) {
    history.back();
  } else {
    window.location.href = "chrome://newtab";
  }
}

// ============================================================
// Proceed Anyway — fires exactly once
// ============================================================

function proceedAnyway() {
  if (proceedFired) return;
  proceedFired = true;

  if (isEnforcement) {
    // Redirect to a constructive learning search.
    // The &edusentinel_redirect=1 marker stops content.js from
    // re-evaluating the destination search page.
    const query   = buildLearningQuery(blockedUrl);
    const destUrl =
      "https://www.google.com/search?q=" +
      encodeURIComponent(query) +
      "&edusentinel_redirect=1";
    window.location.href = destUrl;
  } else {
    // Standard phishing warning: allow navigation to the original URL
    window.location.href = blockedUrl;
  }
}

// ── Dynamic learning query — no static map ───────────────────
// Derives a meaningful educational search from the blocked URL's
// structure alone, producing a different query for every URL.
function buildLearningQuery(rawUrl) {
  try {
    const parsed   = new URL(rawUrl);
    const hostname = parsed.hostname.replace(/^www\./, "");
    const path     = parsed.pathname.toLowerCase();

    const parts = hostname.split(".");
    const brand = parts.length >= 2 ? parts[parts.length - 2] : parts[0];

    const pathContext = (() => {
      if (/short/i.test(path))   return "short-form content and attention span research";
      if (/reel/i.test(path))    return "effect of reels on focus and productivity";
      if (/explore/i.test(path)) return "how recommendation algorithms shape behaviour";
      if (/feed/i.test(path))    return "psychology of infinite scroll and digital wellbeing";
      if (/watch/i.test(path))   return "how to use video content for effective learning";
      if (/game/i.test(path))    return "cognitive science behind gaming and learning";
      if (/story|stories/i.test(path)) return "ephemeral content and student attention research";
      return `impact of ${brand} on student focus and learning outcomes`;
    })();

    return pathContext;
  } catch {
    return "how to improve focus and build productive study habits";
  }
}

// ============================================================
// Enforcement Mode — Motivation Block
// Always renders synchronously inside initWarningPage()
// after the DOM is confirmed to exist. No setTimeout race.
// ============================================================

const QUOTES = [
  "Dream is not what you see in sleep — it's what doesn't let you sleep.",
  "The secret of getting ahead is getting started.",
  "It always seems impossible until it's done.",
  "Don't watch the clock; do what it does — keep going.",
  "The harder you work, the greater you'll feel when you achieve it.",
  "Success is not final, failure is not fatal — it's the courage to continue.",
  "Believe you can, and you're halfway there.",
  "You don't have to be great to start, but you have to start to be great.",
  "The future belongs to those who prepare for it today.",
  "Education is the passport to the future.",
  "Push yourself — no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Do something today your future self will thank you for.",
  "Little things make big days.",
  "Hard doesn't mean impossible.",
  "Don't stop when you're tired — stop when you're done.",
  "Strive for progress, not perfection.",
  "Small daily improvements lead to stunning results.",
  "All dreams can come true if you have the courage to pursue them.",
  "The only way to do great work is to love what you do.",
  "Opportunities don't happen — you create them.",
  "Don't limit your challenges — challenge your limits.",
  "Work hard in silence. Let success make the noise.",
  "The only place success comes before work is the dictionary.",
  "If you can dream it, you can do it.",
  "Stay hungry, stay foolish.",
  "Your only limitation is your imagination.",
  "Sometimes later becomes never — do it now.",
  "The mind is everything. What you think, you become.",
  "An investment in knowledge pays the best interest.",
  "Learning never exhausts the mind.",
  "Nobody can take knowledge away from you.",
  "Education is not filling a pail — it's lighting a fire.",
  "The more you read, the more things you will know.",
  "It doesn't matter how slowly you go — don't stop.",
  "Motivation gets you started. Habit keeps you going.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Discipline is the bridge between goals and accomplishment.",
  "You are never too old to set a new goal.",
  "The pain today is the strength tomorrow.",
  "Hard work beats talent when talent doesn't work hard.",
  "Don't wish it were easier — wish you were better.",
  "Get up with determination, go to bed with satisfaction.",
  "Knowing is not enough — we must apply.",
  "There are no shortcuts to any place worth going.",
  "A year from now you'll wish you had started today.",
  "Don't count the days — make the days count.",
  "It's not about having time — it's about making time.",
  "Be so good they can't ignore you.",
];

function renderMotivationBlock() {
  if (!isEnforcement) return;

  // Guard: don't append twice if somehow called more than once
  if (document.getElementById("edu-motivation-block")) return;

  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  const box = document.createElement("div");
  box.id    = "edu-motivation-block";
  Object.assign(box.style, {
    marginTop    : "24px",
    padding      : "16px 20px",
    borderRadius : "10px",
    background   : "rgba(239,68,68,0.07)",
    border       : "1px solid rgba(239,68,68,0.25)",
    fontFamily   : "Arial, sans-serif",
  });

  box.innerHTML = `
    <h3 style="margin:0 0 8px;font-size:14px;color:#ef4444;">
      🔒 Blocked by Enforcement Mode
    </h3>
    <p style="margin:0 0 12px;font-size:12px;color:#ccc;line-height:1.6;">
      This page looks like a distraction from your goals.
      You're doing great — keep the momentum going!
    </p>
    <p style="margin:0;font-size:12px;color:#f59e0b;font-style:italic;
              border-top:1px solid rgba(255,255,255,0.07);padding-top:12px;line-height:1.6;">
      💡 "${quote}"
    </p>
  `;

  document.body.appendChild(box);
}

// ============================================================
// Blocked-state enforcement — overrides AI panel "safe" labels
// ============================================================

function enforceBlockedState() {
  const safePattern = /safe|legitimate|trusted|secure/i;

  document.querySelectorAll(
    "[class*='status'],[class*='label'],[class*='result'],[class*='verdict']," +
    "[id*='status'],[id*='label'],[id*='result'],[id*='verdict']"
  ).forEach(el => {
    if (safePattern.test(el.textContent)) {
      el.textContent = el.textContent.replace(/safe|legitimate|trusted|secure/gi, "DANGEROUS");
    }
  });

  document.querySelectorAll(
    "[class*='score'],[class*='percent'],[id*='score'],[id*='percent']"
  ).forEach(el => {
    const val = parseFloat(el.textContent);
    if (!isNaN(val) && val >= 50) {
      el.textContent = el.textContent.replace(/[\d.]+/, (100 - val).toFixed(1));
    }
  });

  document.querySelectorAll(".safe,.is-safe,.status-safe,.verdict-safe").forEach(el => {
    el.classList.remove("safe", "is-safe", "status-safe", "verdict-safe");
    el.classList.add("dangerous", "is-dangerous", "status-dangerous", "verdict-dangerous");
  });
}

// ── Observer: catches late/async AI-panel renders ────────────
let blockObserver = null;

function startBlockObserver() {
  if (blockObserver) return; // don't attach twice
  blockObserver = new MutationObserver(enforceBlockedState);
  blockObserver.observe(document.body, { childList: true, subtree: true });
}

// ============================================================
// Main init — runs once after DOM is confirmed ready
// ============================================================

function initWarningPage() {
  // 1. Populate blocked URL + reason text
  applyBaseUI();

  // 2. Wire buttons — { once: true } prevents any duplicate listener
  const backBtn    = document.getElementById("btn-go-back");
  const proceedBtn = document.getElementById("btn-proceed");
   // One Line Added
  renderMotivationBlock();

  if (backBtn)    backBtn.addEventListener("click",    goBack,        { once: true });
  if (proceedBtn) proceedBtn.addEventListener("click", proceedAnyway, { once: true });

  // 3. Enforcement-mode motivation block (synchronous — no race)
  if (isEnforcement) {
    renderMotivationBlock();
  }

  // 4. Blocked-state label overrides + ongoing observer
  if (isBlocked) {
    enforceBlockedState();
    startBlockObserver();
  }
}

// ── Entry point — safe for both "already ready" and "loading" ─
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWarningPage, { once: true });
} else {
  initWarningPage();
}
function renderMotivationBlock() {
  if (!isEnforcement) return;
  if (document.getElementById("edu-motivation-block")) return;

  const reasonCard = document.querySelector(".reason-card");
  if (!reasonCard) return;

  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  const box = document.createElement("div");
  box.id    = "edu-motivation-block";
  Object.assign(box.style, {
    marginTop    : "16px",
    marginBottom : "0",
    padding      : "16px 20px",
    borderRadius : "10px",
    background   : "rgba(239,68,68,0.07)",
    border       : "1px solid rgba(239,68,68,0.25)",
    fontFamily   : "Arial, sans-serif",
    maxWidth     : "440px",
    width        : "100%",
  });

  box.innerHTML = `
    <h3 style="margin:0 0 8px;font-size:14px;color:#ef4444;">
       Blocked by Enforcement Mode
    </h3>
    <p style="margin:0 0 12px;font-size:12px;color:#ccc;line-height:1.6;">
      This page looks like a distraction from your goals.
      You're doing great — keep the momentum going!
    </p>
    <p style="margin:0;font-size:12px;color:#f59e0b;font-style:italic;
              border-top:1px solid rgba(255,255,255,0.07);padding-top:12px;line-height:1.6;">
       "${quote}"
    </p>
  `;

  reasonCard.insertAdjacentElement("afterend", box);
}