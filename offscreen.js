chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  const audio = new Audio(message.audioUrl);
  audio.volume = 0.5;
  await audio.play();
});
