// @ts-check

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'tts',
    title: 'Text to Speech',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.selectionText || info.menuItemId !== 'tts') return;

  chrome.tts.speak(info.selectionText, {
    'lang': 'en-GB',
    'rate': 1,
    'voiceName': 'Google UK English Male',
    'volume': 1,
  });
});
