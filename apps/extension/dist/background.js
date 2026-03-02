// Side Panel API: 拡張アイコンクリックでサイドパネルを開く
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// Content Script からメッセージ受信 → Side Panel に転送
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "COMPANY_EXTRACTED") {
    chrome.storage.local.set({
      extractedCompany: message.value ?? message.company,
      extractedFrom: message.from || "page",
    });
  }
  if (message.type === "REGION_EXTRACTED") {
    chrome.storage.local.set({ extractedRegion: message.value });
  }
  if (message.type === "URL_EXTRACTED") {
    chrome.storage.local.set({ extractedUrl: message.value });
  }
  sendResponse({ ok: true });
  return true;
});
