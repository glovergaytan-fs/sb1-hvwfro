import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({ log: true, verbose: true });

self.onmessage = async (e) => {
  console.log('Worker received data:', e.data);
  const { frames, audioFile, audioData, fps, width, height } = e.data;
  
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  try {
    // Reconstruct AudioBuffer
    console.log('Worker: Received audio data for processing.'); // Log audio data received
    const audioContext = new AudioContext();
    const newBuffer = audioContext.createBuffer(audioData.numberOfChannels, audioData.length, audioData.sampleRate);
    for (let i = 0; i < audioData.numberOfChannels; i++) {
      newBuffer.copyToChannel(new Float32Array(audioData.channelData[i]), i);
    }

    // Convert AudioBuffer to WAV
    const wavBuffer = await audioBufferToWav(newBuffer);
    ffmpeg.FS('writeFile', 'audio.wav', new Uint8Array(wavBuffer));

    for (let i = 0; i < frames.length; i++) {
      console.log(`Worker: Processing frame ${i + 1} of ${frames.length}`); // Log frame processing
      const imageData = new Uint8ClampedArray(frames[i]);
      const image = new ImageData(imageData, width, height);
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      ctx.putImageData(image, 0, 0);
      const blob = await canvas.convertToBlob();
      const arrayBuffer = await blob.arrayBuffer();
      ffmpeg.FS('writeFile', `frame_${i.toString().padStart(5, '0')}.png`, new Uint8Array(arrayBuffer));
      self.postMessage({ type: 'progress', progress: (i / frames.length) * 100 });

      // Process in chunks of 10 frames
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    await ffmpeg.run(
      '-framerate', `${fps}`,
      '-i', 'frame_%05d.png',
      '-i', 'audio.wav',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-pix_fmt', 'yuv420p',
      '-shortest',
      'output.mp4'
    ).on('progress', (progress) => {
      self.postMessage({ type: 'ffmpegProgress', progress });
      });

    const data = ffmpeg.FS('readFile', 'output.mp4');
    self.postMessage({ type: 'complete', data });
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message });
  }
};

// Helper function to convert AudioBuffer to WAV
function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new ArrayBuffer(length);
  const view = new DataView(out);
  const channels = [];
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952);
  setUint32(length - 8);
  setUint32(0x45564157);
  setUint32(0x20746d66);
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164);
  setUint32(length - pos - 4);

  // write interleaved data
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return out;

  function setUint16(data) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}