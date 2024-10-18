import React, { useRef, useEffect, useState, useCallback } from 'react';

interface AudioVisualizerProps {
  audioFile: File;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    audioContext: AudioContext;
  };
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = React.memo(({ audioFile, colorPalette, audioContext }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const animationRef = useRef<number>();

  const setupAudioContext = useCallback(async () => {
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    const newAnalyser = audioContext.createAnalyser();
    newAnalyser.fftSize = 256;
    source.connect(newAnalyser);
    newAnalyser.connect(audioContext.destination);
    setAnalyser(newAnalyser);
    source.start(0);
  }, [audioFile, audioContext]);

  useEffect(() => {
    setupAudioContext();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
    };
  }, [setupAudioContext, audioContext]);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = colorPalette.primary;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        ctx.fillStyle = colorPalette.accent;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, colorPalette]);

  return <canvas ref={canvasRef} width="800" height="200" className="w-full rounded-lg" />;
});