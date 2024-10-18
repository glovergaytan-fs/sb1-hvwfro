self.onmessage = async (e) => {
  const {
    canvas,
    audioBuffer,
    waveform,
    albumCover,
    songTitle,
    lyrics,
    colorPalette,
    aspectRatio,
    fps,
  } = e.data;

  const offscreenCanvas = new OffscreenCanvas(canvas.width, canvas.height);
  const ctx = offscreenCanvas.getContext('2d');

  if (!ctx) {
    self.postMessage({ type: 'error', error: 'Failed to create canvas context' });
    return;
  }

  const frames: ImageData[] = [];
  const duration = audioBuffer.duration;
  const totalFrames = Math.ceil(duration * fps);

  const albumImage = await createImageBitmap(await fetch(albumCover).then(r => r.blob()));

  for (let i = 0; i < totalFrames; i++) {
    renderFrame(ctx, i / fps, albumImage, waveform, songTitle, lyrics, colorPalette, canvas.width, canvas.height);
    frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));

    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  self.postMessage({ type: 'complete', frames });
};

function renderFrame(
  ctx: OffscreenCanvasRenderingContext2D,
  time: number,
  albumImage: ImageBitmap,
  waveform: Float32Array[],
  songTitle: string,
  lyrics: string,
  colorPalette: { primary: string; secondary: string; accent: string },
  width: number,
  height: number
) {
  // Clear canvas
  ctx.fillStyle = colorPalette.primary;
  ctx.fillRect(0, 0, width, height);

  // Draw album cover
  const coverSize = Math.min(width, height) * 0.5;
  const coverX = (width - coverSize) / 2;
  const coverY = (height - coverSize) / 2;
  ctx.drawImage(albumImage, coverX, coverY, coverSize, coverSize);

  // Draw equalizer
  drawEqualizer(ctx, time, waveform, colorPalette.accent, width, height);

  // Draw song title
  ctx.fillStyle = colorPalette.secondary;
  ctx.font = `bold ${height * 0.05}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(songTitle, width / 2, height * 0.1);

  // Draw lyrics
  ctx.font = `${height * 0.03}px Arial`;
  ctx.fillText(lyrics, width / 2, height * 0.9);
}

function drawEqualizer(
  ctx: OffscreenCanvasRenderingContext2D,
  time: number,
  waveform: Float32Array[],
  color: string,
  width: number,
  height: number
) {
  const barWidth = width * 0.01;
  const barSpacing = width * 0.005;
  const maxBarHeight = height * 0.2;

  const sampleIndex = Math.floor(time * waveform.length / (waveform.length / 60));
  const barCount = Math.floor(width / (barWidth + barSpacing));

  ctx.fillStyle = color;

  for (let i = 0; i < barCount; i++) {
    const amplitude = waveform[(sampleIndex + i) % waveform.length] || 0;
    const barHeight = amplitude * maxBarHeight;
    const x = i * (barWidth + barSpacing);
    
    // Top equalizer
    ctx.fillRect(x, 0, barWidth, barHeight);
    
    // Bottom equalizer
    ctx.fillRect(x, height - barHeight, barWidth, barHeight);
    
    // Left equalizer
    ctx.fillRect(0, height - x - barWidth, barHeight, barWidth);
    
    // Right equalizer
    ctx.fillRect(width - barHeight, height - x - barWidth, barHeight, barWidth);
  }
}