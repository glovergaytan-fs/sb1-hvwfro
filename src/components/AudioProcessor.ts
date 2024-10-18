import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

export class AudioProcessor {
  private ffmpeg: any;

  constructor() {
    this.ffmpeg = createFFmpeg({ log: true });
  }

  async processAudio(file: File): Promise<{ buffer: AudioBuffer; waveform: Float32Array[] }> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const waveform = this.generateWaveform(audioBuffer);
    return { buffer: audioBuffer, waveform };
  }

  private generateWaveform(audioBuffer: AudioBuffer): Float32Array[] {
    const channelData = audioBuffer.getChannelData(0);
    const samples = 200;
    const blockSize = Math.floor(channelData.length / samples);
    const waveform = [];

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      const end = start + blockSize;
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += Math.abs(channelData[j]);
      }
      waveform.push(sum / blockSize);
    }

    return waveform;
  }

  async encodeVideo(
    canvas: HTMLCanvasElement,
    audioFile: File,
    duration: number,
    fps: number,
    onProgress: (progress: number) => void
  ): Promise<Uint8Array> {
    try {
      console.log('Starting video encoding process');
      const totalFrames = Math.ceil(duration * fps);
      const ffmpeg = this.ffmpeg;

      if (!ffmpeg.isLoaded()) {
        await ffmpeg.load();
      }

      console.log('Writing audio file to FFmpeg filesystem');
      ffmpeg.FS('writeFile', 'audio.mp3', await fetchFile(audioFile));

      console.log('Generating video frames');
      for (let i = 0; i < totalFrames; i++) {
        const imageData = canvas.toDataURL('image/png').split(',')[1];
        ffmpeg.FS('writeFile', `frame_${i.toString().padStart(5, '0')}.png`, Uint8Array.from(atob(imageData), c => c.charCodeAt(0)));
        onProgress((i / totalFrames) * 100);
        
        // Add a small delay to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      console.log('Running FFmpeg command');
      await ffmpeg.run(
        '-framerate', `${fps}`,
        '-i', 'frame_%05d.png',
        '-i', 'audio.mp3',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-pix_fmt', 'yuv420p',
        '-shortest',
        'output.mp4'
      );

      console.log('Reading output file');
      const data = ffmpeg.FS('readFile', 'output.mp4');
      return data;
    } catch (error) {
      console.error('Error encoding video:', error);
      throw new Error('Failed to encode video. Please try again.');
    }
  }
}