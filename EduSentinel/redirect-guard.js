// ============================================================
// EduSentinel AI — redirect-guard.js  [FINAL FIX]
// ============================================================

const OFFICIAL_SITES = {
  google: "https://www.google.com",
  amazon: "https://www.amazon.in",
  facebook: "https://www.facebook.com",
  instagram: "https://www.instagram.com",
  microsoft: "https://www.microsoft.com",
  apple: "https://www.apple.com",
  netflix: "https://www.netflix.com",
  paypal: "https://www.paypal.com",
  yahoo: "https://www.yahoo.com",
  linkedin: "https://www.linkedin.com",
  twitter: "https://www.twitter.com",
  dropbox: "https://www.dropbox.com",
  outlook: "https://outlook.live.com",
  office: "https://www.office.com",
  chase: "https://www.chase.com",
  wellsfargo: "https://www.wellsfargo.com",
  ebay: "https://www.ebay.com",
  whatsapp: "https://www.whatsapp.com",
  steam: "https://store.steampowered.com",
  spotify: "https://www.spotify.com",
  adobe: "https://www.adobe.com",
  discord: "https://discord.com",
  roblox: "https://www.roblox.com",
  snapchat: "https://www.snapchat.com",
};

async function initRedirectGuard() {
  try {
    const params = new URLSearchParams(window.location.search);
    const blockedUrl = params.get("url");

    if (!blockedUrl) return;

    console.log("[EduSentinel] URL:", blockedUrl);

    let brand = null;
    let officialUrl = null;

    // ✅ 1. Try AI
    if (typeof window.predictBrand === "function") {
      try {
        const result = await window.predictBrand(blockedUrl);
        console.log("[EduSentinel] AI result:", result);

        if (result && result.brand) {
          brand = result.brand;
          officialUrl = OFFICIAL_SITES[brand];
        }
      } catch (e) {
        console.warn("[EduSentinel] AI failed:", e);
      }
    }

    // ✅ 2. Fallback (IMPORTANT FIX)
    if (!brand) {
      const lower = blockedUrl.toLowerCase();
      for (const key in OFFICIAL_SITES) {
        if (lower.includes(key)) {
          brand = key;
          officialUrl = OFFICIAL_SITES[key];
          console.log("[EduSentinel] Fallback brand:", brand);
          break;
        }
      }
    }

    // ✅ 3. FORCE DEFAULT (FINAL SAFETY)
    if (!brand) {
      brand = "website";
      officialUrl = blockedUrl;
    }

    // ✅ 4. ALWAYS CREATE BUTTON (NO RETURN BLOCK)
    const btn = document.createElement("button");
    btn.id = "btn-official-redirect";
    btn.className = "btn";
    btn.innerText = `Continue to Official ${brand}`;

    btn.onclick = () => {
      window.location.href = officialUrl;
    };

    // ✅ 5. WAIT FOR DOM (FIX)
    let actions = null;
    let tries = 0;

    while (!actions && tries < 20) {
      actions = document.querySelector(".actions");
      if (!actions) {
        await new Promise(r => setTimeout(r, 100));
        tries++;
      }
    }

    if (actions) {
      actions.appendChild(btn);
    } else {
      document.body.appendChild(btn);
    }

    console.log("[EduSentinel] Button injected");

  } catch (err) {
    console.warn("[EduSentinel] redirect error:", err);
  }
}

// DOM safe run
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRedirectGuard);
} else {
  initRedirectGuard();
}