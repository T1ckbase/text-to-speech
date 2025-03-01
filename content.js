// // "content_scripts": [
// //     {
// //         "js" : ["content.js"],
// //         "matches": ["<all_urls>"],
// //         "run_at": "document_end"
// //     }
// // ],



// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
//   // console.log(sender);
//   console.log(request);
//   if (chrome.runtime.id != sender.id) {
//     return;
//   }

//   // const blob = new Blob([new Uint8Array(request.audio_data)], { type: request.content_type});
//   // const src = URL.createObjectURL(blob);
//   // // const audio = new Audio(src);
//   // const audio = new Audio(blob);
//   // // console.log(audio);
//   // audio.play();

//   chrome.tts.speak('Hello, world.');

//   return;
// });