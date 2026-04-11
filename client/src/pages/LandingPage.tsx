/**
 * LandingPage — Full NERVE landing page with all sections.
 */
import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { DemoPreview } from '@/components/landing/DemoPreview';
import { CTASection } from '@/components/landing/CTASection';
import { Footer } from '@/components/landing/Footer';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[oklch(0.10_0.025_270)]">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <DemoPreview />
      <CTASection />
      <Footer />
    </div>
  );
}
