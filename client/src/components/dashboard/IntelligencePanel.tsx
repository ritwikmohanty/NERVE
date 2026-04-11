/**
 * IntelligencePanel — Right side panel with all intelligence cards.
 */
import { ScrollArea } from '@/components/ui/scroll-area';
import { IntentScoreCard } from './panels/IntentScoreCard';
import { SignalStackCard } from './panels/SignalStackCard';
import { PersonaCard } from './panels/PersonaCard';
import { DecisionTheatreCard } from './panels/DecisionTheatreCard';
import { MessagePreviewCard } from './panels/MessagePreviewCard';
import { DeliveryLogsCard } from './panels/DeliveryLogsCard';
import { LearningLoopCard } from './panels/LearningLoopCard';

export function IntelligencePanel() {
  return (
    <div className="w-[340px] h-full border-l border-white/[0.06] bg-black/20 backdrop-blur-sm flex flex-col">
      <div className="h-12 flex items-center px-4 border-b border-white/[0.06]">
        <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          Real-Time Intelligence
        </h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          <IntentScoreCard />
          <SignalStackCard />
          <PersonaCard />
          <DecisionTheatreCard />
          <MessagePreviewCard />
          <DeliveryLogsCard />
          <LearningLoopCard />
        </div>
      </ScrollArea>
    </div>
  );
}
