import React, { useEffect, useRef } from 'react';

const BackgroundFX: React.FC = () => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;

    type Star = { x: number; y: number; z: number; r: number; tw: number };
    let stars: Star[] = [];

    const makeStars = () => {
      const count = Math.round((W * H) / 9000); // density
      stars = Array.from({ length: count }).map(() => ({
        x: Math.random() * W,
        y: Math.random() * H,
        z: 0.3 + Math.random() * 0.7,       // depth
        r: 0.4 + Math.random() * 1.2,       // radius
        tw: Math.random() * Math.PI * 2,    // twinkle phase
      }));
    };

    const resize = () => {
      W = Math.floor(window.innerWidth * DPR);
      H = Math.floor(window.innerHeight * DPR);
      canvas.width = W;
      canvas.height = H;
      canvas.style.width = `${Math.floor(W / DPR)}px`;
      canvas.style.height = `${Math.floor(H / DPR)}px`;
      makeStars();
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);

      // subtle nebula fog
      const g = ctx.createRadialGradient(W * 0.7, H * 0.3, 10, W * 0.5, H * 0.4, Math.max(W, H) * 0.7);
      g.addColorStop(0, 'rgba(90, 30, 160, 0.18)');
      g.addColorStop(0.6, 'rgba(20, 180, 160, 0.10)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // stars
      for (const s of stars) {
        s.tw += 0.01;
        const alpha = 0.35 + Math.sin(s.tw) * 0.25;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * s.z, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(230,240,255,0.9)';
        ctx.fill();

        // gentle parallax drift
        s.x += (0.02 + 0.06 * s.z);
        if (s.x > W + 5) s.x = -5;
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="bg-canvas" aria-hidden="true" />;
};

export default BackgroundFX;
