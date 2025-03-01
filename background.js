// @ts-check

/** @typedef {"af_heart"|"af_bella"|"af_nicole"|"af_aoede"|"af_kore"|"af_sarah"|"af_nova"|"af_sky"|"af_alloy"|"af_jessica"|"af_river"|"am_michael"|"am_fenrir"|"am_puck"|"am_echo"|"am_eric"|"am_liam"|"am_onyx"|"am_santa"|"am_adam"|"bf_emma"|"bf_isabella"|"bf_alice"|"bf_lily"|"bm_george"|"bm_fable"|"bm_lewis"|"bm_daniel"} Voice */

/**
 * @typedef {Object} KokoroPayload
 * @property {[query: string, voice: Voice, speed: number, useGpu: boolean]} data - An array containing various data types.
 * @property {null} event_data - Event data (currently null).
 * @property {number} fn_index - Function index.
 * @property {number} trigger_id - Trigger ID.
 * @property {string} session_hash - Session hash.
 */

const OFFSCREEN_URL = 'offscreen.html';

class KokoroTTS {
  constructor(baseUrl = 'https://hexgrad-kokoro-tts.hf.space') {
    this.baseUrl = baseUrl;
    this.abortController = null;
  }

  /**
   * Aborts any ongoing TTS generation
   */
  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * @param {string} query
   * @param {Voice} voice
   * @param {number} speed
   * @param {boolean} useGpu
   * @returns {Promise<string>}
   */
  async generate(query, voice, speed, useGpu) {
    this.abort();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      const { eventId, sessionHash } = await this.join([query, voice, speed, useGpu]);
      const path = `/gradio_api/queue/data?session_hash=${sessionHash}`;
      const response = await fetch(`${this.baseUrl}${path}`, {
        headers: { 'Accept': 'text/event-stream' }
      });
      if (!response.ok) throw Error(`${path} ${response.status} ${response.statusText}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = '';
    
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        const text = decoder.decode(value, { stream: true });
        buffer += text;
        
        const lines = buffer.split('\n');
        
        buffer = lines.pop() || '';
        
        let eventData = '';
        for (const line of lines) {
          if (line.trim() === '') {
            if (eventData) {
              try {
                const jsonData = JSON.parse(eventData);
                if (jsonData.msg === 'process_completed') {
                  return jsonData.output.data[0].url;
                }
              } catch (e) {
                console.error('Failed to parse event data:', e);
              }
              eventData = '';
            }
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6);
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('TTS generation was aborted');
      }
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * @param {KokoroPayload['data']} data
   * @returns {Promise<{ eventId: string, sessionHash: string }>}
   */
  async join(data) {
    const path = '/gradio_api/queue/join';
    const session_hash = this.#randomSessionHash();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(/**@type {KokoroPayload}*/({
        data,
        event_data: null,
        fn_index: 4,
        trigger_id: 2,
        session_hash,
      })),
    });
    if (!response.ok) throw Error(`${path} ${response.status} ${response.statusText}`);

    const { event_id } = await response.json();
    return { eventId: event_id, sessionHash: session_hash };
  }

  /**
   * @param {number} len 
   * @returns {string}
   */
  #randomSessionHash(len = 11) {
    return [...crypto.getRandomValues(new Uint8Array(len))].map((x, i) => (i = x / 255 * 61 | 0, String.fromCharCode(i + (i > 9 ? i > 35 ? 61 : 55 : 48)))).join('');
  }
}

let creating; // A global promise to avoid concurrency issues
async function setupOffscreenDocument(path, justification) {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: path
  });

  if (existingContexts.length > 0) {
    return;
  }

  // create offscreen document
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ['AUDIO_PLAYBACK'],
      justification: justification,
    });
    await creating;
    creating = null;
  }
}

const kokoroTTS = new KokoroTTS();

chrome.offscreen.createDocument({
  url: OFFSCREEN_URL,
  reasons: ['AUDIO_PLAYBACK'],
  justification: 'tts',
});

chrome.contextMenus.removeAll().then(() => {
  chrome.contextMenus.create({
    id: 'tts',
    title: 'Text to Speech',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // chrome.tts.speak(info.selectionText, { 'lang': 'en-gb', 'rate': 1, 'volume': 0.5, 'voiceName': 'Google UK English Male' });
  try {
    // await setupOffscreenDocument(OFFSCREEN_URL, 'tts');

    const audioUrl = await Promise.any([
      kokoroTTS.generate(info.selectionText, 'am_liam', 1, false),
      kokoroTTS.generate(info.selectionText, 'am_liam', 1, true),
    ]);
    // console.log(audioUrl);

    await chrome.runtime.sendMessage({ audioUrl, target: 'offscreen' });
  } catch (error) {
    console.error('TTS generation failed:', error);
  }
});

chrome.runtime.onSuspend.addListener(async () => {
  await chrome.offscreen.closeDocument();
});