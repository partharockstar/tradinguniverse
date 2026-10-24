import React, { useEffect, useRef } from 'react';

interface ShootingStarsProps {
  isDarkMode?: boolean;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  alphaChange: number;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  opacity: number;
  fadeSpeed: number;
  active: boolean;
  delay: number;
}

export const ShootingStars: React.FC<ShootingStarsProps> = ({ isDarkMode = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = Math.max(canvas.parentElement?.clientWidth || 0, window.innerWidth));
    let height = (canvas.height = Math.max(canvas.parentElement?.clientHeight || 0, window.innerHeight));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = Math.max(canvas.parentElement?.clientWidth || 0, window.innerWidth);
      height = canvas.height = Math.max(canvas.parentElement?.clientHeight || 0, window.innerHeight);
      initStars();
    };

    window.addEventListener('resize', handleResize);

    // Static / Twinkling background stars
    let stars: Star[] = [];
    const initStars = () => {
      stars = [];
      const count = Math.floor((width * height) / 8000);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.4 + 0.5,
          alpha: Math.random() * 0.8 + 0.2,
          alphaChange: (Math.random() * 0.02 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
        });
      }
    };
    initStars();

    // Shooting stars pool
    const shootingStars: ShootingStar[] = [];
    const maxShootingStars = 4;

    const createShootingStar = (): ShootingStar => {
      return {
        x: Math.random() * width * 0.8,
        y: Math.random() * (height * 0.4),
        length: Math.random() * 80 + 70,
        speed: Math.random() * 8 + 10,
        angle: (Math.PI / 4) + (Math.random() * 0.2 - 0.1), // roughly 45 degrees
        opacity: 1,
        fadeSpeed: Math.random() * 0.015 + 0.01,
        active: false,
        delay: Math.random() * 180 + 30, // frames delay before shooting
      };
    };

    for (let i = 0; i < maxShootingStars; i++) {
      shootingStars.push(createShootingStar());
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render twinkling stars ("chik bik" preserved and enhanced without any blue haze)
      stars.forEach((star) => {
        star.alpha += star.alphaChange;
        if (star.alpha <= 0.12) {
          star.alpha = 0.12;
          star.alphaChange = Math.abs(star.alphaChange);
        } else if (star.alpha >= 0.98) {
          star.alpha = 0.98;
          star.alphaChange = -Math.abs(star.alphaChange);
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        // Pure crisp diamond white twinkle
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fill();

        // Authentic twinkling sparkle cross ("chik bik") for brightest stars
        if (star.alpha > 0.72 && star.radius > 1.05) {
          const sparkLen = star.radius * 2.8;
          ctx.strokeStyle = `rgba(255, 255, 255, ${(star.alpha - 0.72) * 2.2})`;
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.moveTo(star.x - sparkLen, star.y);
          ctx.lineTo(star.x + sparkLen, star.y);
          ctx.moveTo(star.x, star.y - sparkLen);
          ctx.lineTo(star.x, star.y + sparkLen);
          ctx.stroke();
        }
      });

      // Render shooting stars (pure silver/white cosmic trails, no blue haze)
      shootingStars.forEach((star) => {
        if (!star.active) {
          star.delay--;
          if (star.delay <= 0) {
            star.active = true;
            star.x = Math.random() * (width * 0.9);
            star.y = Math.random() * (height * 0.35);
            star.opacity = 1;
          }
          return;
        }

        const headX = star.x;
        const headY = star.y;
        const tailX = star.x - Math.cos(star.angle) * star.length;
        const tailY = star.y - Math.sin(star.angle) * star.length;

        const starGradient = ctx.createLinearGradient(headX, headY, tailX, tailY);
        starGradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity})`);
        starGradient.addColorStop(0.35, `rgba(240, 240, 245, ${star.opacity * 0.75})`);
        starGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.moveTo(headX, headY);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = starGradient;
        ctx.lineWidth = 2.0;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Glow particle at head of shooting star (pure white crystal)
        ctx.beginPath();
        ctx.arc(headX, headY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Advance position
        star.x += Math.cos(star.angle) * star.speed;
        star.y += Math.sin(star.angle) * star.speed;
        star.opacity -= star.fadeSpeed;

        if (star.opacity <= 0 || star.x > width || star.y > height) {
          star.active = false;
          star.delay = Math.random() * 160 + 50; // reset delay
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDarkMode]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
    />
  );
};
