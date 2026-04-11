/**
 * DashboardPage — NERVE AI Command Center dashboard.
 * Sidebar + Command Bar + Agent Graph + Intelligence Panel
 */
import { NerveProvider } from '@/store/nerve-context';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { CommandBar } from '@/components/dashboard/CommandBar';
import { AgentGraph } from '@/components/dashboard/AgentGraph';
import { IntelligencePanel } from '@/components/dashboard/IntelligencePanel';

function DashboardContent() {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[oklch(0.08_0.025_270)]">
      {/* Left Sidebar */}
      <DashboardSidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Command Bar */}
        <CommandBar />

        {/* Content area: Graph + Panel */}
        <div className="flex-1 flex min-h-0">
          {/* Agent Graph - center */}
          <div className="flex-1 relative">
            <AgentGraph />
          </div>

          {/* Intelligence Panel - right */}
          <IntelligencePanel />
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  return (
    <NerveProvider>
      <DashboardContent />
    </NerveProvider>
  );
}
