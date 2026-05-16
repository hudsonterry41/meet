// Virtual background (green‑screen) module
let bgImage = null;
let bgVideo = null;
let bgImageEl = null;
let bgVideoEl = null;
let canvas = null;
let ctx = null;
let keyingCanvas = null;
let keyingCtx = null;

// Called from main.js or userState changes
function applyVirtualBackground(imageUrl, videoUrl) {
  if (imageUrl) {
    bgImage = imageUrl;
    if (!bgImageEl) {
      bgImageEl = document.createElement("img");
      bgImageEl.style.display = "none";
      document.body.appendChild(bgImageEl);
    }
    bgImageEl.src = imageUrl;
  }
  if (videoUrl) {
    bgVideo = videoUrl;
    if (!bgVideoEl) {
      bgVideoEl = document.createElement("video");
      bgVideoEl.style.display = "none";
      bgVideoEl.muted = true;
      bgVideoEl.loop = true;
      document.body.appendChild(bgVideoEl);
    }
    bgVideoEl.src = videoUrl;
    bgVideoEl.play().catch(() => {});
  }
}

// Returns a new MediaStream with virtual background (chroma key)
async function applyVirtualBackgroundToStream(stream) {
  // Create off‑screen canvas + keying canvas
  canvas = document.createElement("canvas");
  ctx = canvas.getContext("2d");
  keyingCanvas = document.createElement("canvas");
  keyingCtx = keyingCanvas.getContext("2d");

  const video = document.createElement("video");
  video.srcObject = stream;
  video.play();
  video.muted = true;

  // Wait for video to be ready
  await new Promise(resolve => {
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      keyingCanvas.width = video.videoWidth;
      keyingCanvas.height = video.videoHeight;
      resolve();
    };
  });

  // Draw loop
  function draw() {
    const w = canvas.width;
    const h = canvas.height;

    // Clear both canvases
    ctx.clearRect(0, 0, w, h);
    keyingCtx.clearRect(0, 0, w, h);

    // Draw webcam to keying canvas
    keyingCtx.drawImage(video, 0, 0, w, h);

    // Get pixel data
    const imageData = keyingCtx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Chroma key (green screen)
    const keyColor = [0, 255, 0];  // RGB green
    const tolerance = 90;         // How close to green a pixel can be
    const minBrightness = 80;     // Avoid dark green shadows

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i + 0];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + b) / 2;

      const dr = r - keyColor[0];
      const dg = g - keyColor[1];
      const db = b - keyColor[2];
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);

      if (dist < tolerance && brightness > minBrightness) {
        data[i + 3] = 0; // Transparent
      } else {
        if (data[i + 3] > 0) data[i + 3] = 255;
      }
    }

    keyingCtx.putImageData(imageData, 0, 0);

    // Draw background (image or video)
    if (bgImageEl && bgImageEl.complete) {
      ctx.drawImage(bgImageEl, 0, 0, w, h);
    } else if (bgVideoEl && bgVideoEl.readyState >= 2) {
      ctx.drawImage(bgVideoEl, 0, 0, w, h);
    }

    // Composite keyed webcam over background
    ctx.drawImage(keyingCanvas, 0, 0, w, h);

    // Keep drawing
    if (video.readyState === 4) {
      requestAnimationFrame(draw);
    }
  }

  draw();

  // Capture the canvas as a new MediaStream
  const canvasStream = canvas.captureStream(30);
  const [videoTrack] = canvasStream.getVideoTracks();
  const [audioTrack] = stream.getAudioTracks();
  const mixedStream = new MediaStream([videoTrack, audioTrack]);

  return mixedStream;
}
