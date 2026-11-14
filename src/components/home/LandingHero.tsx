'use client';

import { useState } from 'react';
import { HeroSection } from './landing/HeroSection';
import { FeaturesGrid } from './landing/FeaturesGrid';
import { InteractiveSplitPlayground } from './landing/InteractiveSplitPlayground';
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
      {/* 1. Cinematic Hero Section with Live Split Preview */}
      <HeroSection onDemoClick={handleDemoLogin} demoLoading={demoLoading} />

      {/* 2. Focused 4-Core Superpowers Grid */}
      <FeaturesGrid />

      {/* 3. Interactive Min-Cash Flow Debt Simplification Playground */}
      <InteractiveSplitPlayground />

      {/* 4. Streamlined Final CTA & Minimalist Footer */}
      <CtaSection onDemoClick={handleDemoLogin} demoLoading={demoLoading} />
    </div>
  );
}
