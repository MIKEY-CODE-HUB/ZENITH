document.getElementById("open-zenith").addEventListener("click", () => {
  chrome.storage.local.get(['zenithFocusUrl'], (data) => {
    const url = data?.zenithFocusUrl || 'https://zenith-dusky-theta.vercel.app/rooms';
    chrome.tabs.create({ url });
  });
});
