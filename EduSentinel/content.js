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