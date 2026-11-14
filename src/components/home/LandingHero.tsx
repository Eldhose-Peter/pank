'use client';

import { useState } from 'react';
import { HeroSection } from './landing/HeroSection';
import { CommonManComparison } from './landing/CommonManComparison';
import { ScrollScrubShowcase } from './landing/ScrollScrubShowcase';
import { FeaturesGrid } from './landing/FeaturesGrid';
import { InteractiveSplitPlayground } from './landing/InteractiveSplitPlayground';
import { FaqSection } from './landing/FaqSection';
import { CtaSection } from './landing/CtaSection';

export function LandingHero() {
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Demo login error:', err);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="relative isolate overflow-hidden">
      {/* 1. Cinematic Entrance Hero Section */}
      <HeroSection onDemoClick={handleDemoLogin} demoLoading={demoLoading} />

      {/* 2. Common Man Reality Check & Problem Comparison */}
      <CommonManComparison />

      {/* 3. High-End 60fps Scroll-Scrubbing Interactive Showcase */}
      <ScrollScrubShowcase />

      {/* 4. Complete Up-to-Date Feature Suite Grid */}
      <FeaturesGrid />

      {/* 5. Interactive Min-Cash Flow Debt Simplification Playground */}
      <InteractiveSplitPlayground />

      {/* 6. Human-Friendly FAQ Section */}
      <FaqSection />

      {/* 7. Final High-Impact CTA & Minimalist Footer */}
      <CtaSection onDemoClick={handleDemoLogin} demoLoading={demoLoading} />
    </div>
  );
}
