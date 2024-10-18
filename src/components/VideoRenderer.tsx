export class VideoRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioData: {
    numberOfChannels: number;
    sampleRate: number;
    length: number;
    channelData: Float32Array[];
  };
  private waveform: Float32Array[];
  private albumCover: string;
  private songTitle: string;
  private lyrics: string;
  private colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  private aspectRatio: string;
  private worker: Worker;
   private setCanvasSize() {
    let width = 16; // Default width
    let height = 9; // Default height
  
    // Check if aspectRatio is a string and can be split
    console.log(this.aspectRatio, typeof(this.aspectRatio))
     console.log(this.audioData, typeof(this.audioData))
    if (typeof this.aspectRatio === 'string' && this.aspectRatio.includes(':')) {
      const [w, h] = this.aspectRatio.split(':').map(Number);
      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        width = w;
        height = h;
      } else {
        console.warn('Invalid aspect ratio format. Using default 16:9.');
      }
    } else {
      console.warn('aspectRatio is not a string or is missing ":". Using default 16:9.');
    }
  
    this.canvas.width = 1920;
    this.canvas.height = (1920 * height) / width;
  }

  constructor(
    canvas: HTMLCanvasElement,
    audioData: { // Correct: No "private" keyword here
      numberOfChannels: number;
      sampleRate: number;
      length: number;
      channelData: Float32Array[];
    },
    waveform: Float32Array[],
    albumCover: string,
    songTitle: string,
    lyrics: string,
    colorPalette: { primary: string; secondary: string; accent: string },
    aspectRatio: string
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.canvas = canvas;
    this.audioData = audioData;
    this.waveform = waveform;
    this.albumCover = albumCover;
    this.songTitle = songTitle;
    this.lyrics = lyrics;
    this.colorPalette = colorPalette;
    this.aspectRatio = aspectRatio;


    this.worker = new Worker(new URL('../workers/renderWorker.ts', import.meta.url), { type: 'module' });
  }


  async renderFrames(fps: number): Promise<ImageData[]> {
    this.setCanvasSize();
    
    return new Promise((resolve, reject) => {
      this.worker.onmessage = (e) => {
        if (e.data.type === 'complete') {
          resolve(e.data.frames);
        } else if (e.data.type === 'error') {
          reject(new Error(e.data.error));
        }
      };

      this.worker.postMessage({
        canvas: {
          width: this.canvas.width,
          height: this.canvas.height,
        },
        audioData: this.audioData,
        waveform: this.waveform,
        albumCover: this.albumCover,
        songTitle: this.songTitle,
        lyrics: this.lyrics,
        colorPalette: this.colorPalette,
        aspectRatio: this.aspectRatio,
        fps,
      });
    });
  }
}