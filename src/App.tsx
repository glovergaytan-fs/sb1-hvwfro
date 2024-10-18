import React, { useState, useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash';
import FileUpload from './components/FileUpload';
import ColorPalette from './components/ColorPalette';
import AspectRatioSelector from './components/AspectRatioSelector';
import { AudioVisualizer } from './components/AudioVisualizer';
import VideoPreview from './components/VideoPreview';
import { AudioProcessor } from './components/AudioProcessor';
import { VideoRenderer } from './components/VideoRenderer';
import { Music, Image, Play, Square } from 'lucide-react';

function App() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [albumCover, setAlbumCover] = useState<string | null>(null);
  const [songTitle, setSongTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [colorPalette, setColorPalette] = useState({
    primary: '#000000',
    secondary: '#ffffff',
    accent: '#ff0000',
  });
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioProcessor = useRef(new AudioProcessor());
  const workerRef = useRef<Worker | null>(null);
  const audioContext = useRef(new (window.AudioContext || (window as any).webkitAudioContext)());

  useEffect(() => {
    workerRef.current = new Worker(new URL('./workers/videoWorker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'ffmpegProgress') {
        console.log('FFmpeg progress:', e.data.progress); // Log to console
        setProgress(e.data.progress.percent); // Update progress state (if you have one)
      }
      const { type, progress, data, error } = e.data;
      switch (type) {
        case 'progress':
          setProgress(progress);
          break;
        case 'complete':
          const blob = new Blob([data], { type: 'video/mp4' });
          const url = URL.createObjectURL(blob);
          setVideoUrl(url);
          setIsGenerating(false);
          break;
        case 'error':
          console.error('Error generating video:', error);
          setIsGenerating(false);
          break;
      }
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const handleAudioFileSelect = (file: File) => {
    setAudioFile(file);
    if (audioRef.current) {
      audioRef.current.src = URL.createObjectURL(file);

      // Pause immediately after the audio is loaded
      audioRef.current.onloadeddata = () => {
        audioRef.current.pause();
        setIsPlaying(false);
      };

      audioRef.current.load();
    }
  };


  const handleAlbumCoverSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setAlbumCover(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateVideo = async () => {
    if (!audioFile || !albumCover || !canvasRef.current || !workerRef.current) return;

    setIsGenerating(true);
    setProgress(0);

    try {
      const { buffer, waveform } = await audioProcessor.current.processAudio(audioFile);



      // Extract audio data for transfer
      const channelData = [];
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        channelData.push(buffer.getChannelData(i));
      }

      const audioData = {
        numberOfChannels: buffer.numberOfChannels,
        sampleRate: buffer.sampleRate,
        length: buffer.length, 
        channelData: channelData,
      };
      
      const videoRenderer = new VideoRenderer(
        canvasRef.current,
        audioData, // This should be the audioData object
        waveform,  // This should be the waveform array
        albumCover,
        songTitle,
        lyrics,
        colorPalette,
        aspectRatio // This should be the aspectRatio string
      );
      console.log(aspectRatio)

      const frames = await videoRenderer.renderFrames(30); // Render 30 frames per second
      // Convert ImageData to transferable ArrayBuffers
      const transferableFrames = frames.map(frame => frame.data.buffer);

      // Send data to worker
      workerRef.current.postMessage({
        frames: transferableFrames,
        audioData: audioData, // Send the extracted audio data
        fps: 30,
        width: canvasRef.current.width,
        height: canvasRef.current.height,
      }, [...transferableFrames, ...channelData.map(data => data.buffer)]); // Transfer ownership of ArrayBuffers

    } catch (error) {
      console.error('Error generating video:', error);
      setIsGenerating(false);

      if (error instanceof Error) {
        alert(`An error occurred: ${error.message}`); 
      } else {
        alert('An unknown error occurred during video generation.');
      }
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  // Debounced input handlers
  const debouncedSetSongTitle = useCallback(debounce((value: string) => setSongTitle(value), 300), []);
  const debouncedSetLyrics = useCallback(debounce((value: string) => setLyrics(value), 300), []);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[90vw] w-full space-y-8 bg-white p-10 rounded-xl shadow-md">
        <h1 className="text-3xl font-bold text-center mb-8">MP3 Video Visualizer</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <FileUpload
              label="Upload MP3"
              icon={<Music className="w-8 h-8 text-gray-400" />}
              onFileSelect={handleAudioFileSelect}
              accept=".mp3"
            />
            
            <FileUpload
              label="Upload Album Cover"
              icon={<Image className="w-8 h-8 text-gray-400" />}
              onFileSelect={handleAlbumCoverSelect}
              accept="image/*"
            />
            
            <div>
              <label htmlFor="songTitle" className="block text-sm font-medium text-gray-700">
                Song Title
              </label>
              <input
                type="text"
                id="songTitle"
                onChange={(e) => debouncedSetSongTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
            
            <div>
              <label htmlFor="lyrics" className="block text-sm font-medium text-gray-700">
                Lyrics
              </label>
              <textarea
                id="lyrics"
                onChange={(e) => debouncedSetLyrics(e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              ></textarea>
            </div>
          </div>
          
          <div className="space-y-6">
            <ColorPalette colorPalette={colorPalette} setColorPalette={setColorPalette} />
            <AspectRatioSelector aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} />
            
            {audioFile && audioContext.current && (
              <div>
                <AudioVisualizer audioFile={audioFile} colorPalette={colorPalette} audioContext={audioContext.current} /> 
                <div className="mt-4 flex justify-center space-x-4">
                  <button
                    onClick={togglePlayPause}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {isPlaying ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <button
                    onClick={stopAudio}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </button>
                </div>
              </div>
            )}
            
            <button
              onClick={handleGenerateVideo}
              disabled={isGenerating || !audioFile || !albumCover}
              className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isGenerating ? `Generating... ${progress.toFixed(2)}%` : 'Generate Video'}
            </button>
          </div>
        </div>
        
        {videoUrl && <VideoPreview videoUrl={videoUrl} />}
        
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <audio ref={audioRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}

export default App;