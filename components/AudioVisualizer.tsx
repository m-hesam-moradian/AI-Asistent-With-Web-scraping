import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  isConnected: boolean;
  volume: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isConnected, volume }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    // Initial resize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const minDimension = Math.min(canvas.width, canvas.height);
      const baseRadius = minDimension * 0.2; // Responsive radius
      const maxRadius = minDimension * 0.35;
      
      if (!isConnected) {
        // Draw idle circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)'; // Slate 600
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        const currentRadius = baseRadius + (volume * (maxRadius - baseRadius));

        // Glow
        const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.5, centerX, centerY, currentRadius);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)'); // Blue
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0)'); // Purple transparent

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        // Waveform rings
        ctx.strokeStyle = `rgba(96, 165, 250, ${0.5 + volume})`;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        for (let i = 0; i <= 360; i += 5) {
            const radian = (i * Math.PI) / 180;
            const noise = Math.sin(i * 0.1 + phase) * (volume * (baseRadius * 0.5)); 
            const r = baseRadius + noise;
            const x = centerX + r * Math.cos(radian);
            const y = centerY + r * Math.sin(radian);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        phase += 0.1;
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isConnected, volume]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[150px] flex items-center justify-center">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
};