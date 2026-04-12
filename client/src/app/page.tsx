import React from 'react';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import AgentGraphCard from '@/components/AgentGraphCard';
import HowItWorks from '@/components/HowItWorks';
import FeaturePanels from '@/components/FeaturePanels';
import AgentsGrid from '@/components/AgentsGrid';
import IntegrationsGrid from '@/components/IntegrationsGrid';
import LearningLoop from '@/components/LearningLoop';
import DeveloperExperience from '@/components/DeveloperExperience';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#F5F2E8] overflow-x-hidden">
      <Navbar />
      
      <section className="relative">
        <HeroSection />
        <div className="absolute right-[3rem] top-1/2 -translate-y-1/2 z-[2]">
          <AgentGraphCard />
        </div>
      </section>
      
      <HowItWorks />
      
      <FeaturePanels />
      
      <AgentsGrid />
      
      <IntegrationsGrid />

      <DeveloperExperience />
      
      <LearningLoop />
      
      <CTASection />
      
      <Footer />
    </main>
  );
}
