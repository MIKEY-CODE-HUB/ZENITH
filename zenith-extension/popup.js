document.getElementById("open-zenith").addEventListener("click", () => {
  chrome.tabs.create({ url: "http://localhost:3000/rooms" });
});
