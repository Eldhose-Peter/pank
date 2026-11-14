'use client';

import { useEffect, useRef, useState } from 'react';

export function useScrollProgress() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number | null = null;

    const calculateProgress = () => {
      const rect = container.getBoundingClientRect();
      const scrollableDistance = container.offsetHeight - window.innerHeight;

      if (scrollableDistance <= 0) {
        setProgress(0);
        return;
      }

      // How much has the top scrolled past the top of the viewport
      const scrolled = -rect.top;
      const rawProgress = scrolled / scrollableDistance;
      const clamped = Math.max(0, Math.min(1, rawProgress));

      setProgress((prev) => {
        // Only trigger React state update if changed noticeably to avoid unnecessary re-renders
        if (Math.abs(prev - clamped) > 0.001) {
          return clamped;
        }
        return prev;
      });
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        calculateProgress();
        rafId = null;
      });
    };

    // Initial calculation
    calculateProgress();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return { containerRef, progress };
}
