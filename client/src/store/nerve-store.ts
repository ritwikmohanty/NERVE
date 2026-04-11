/**
 * NERVE State Management
 * Centralized store for the entire agent orchestration pipeline.
 * Uses React context + useReducer for clean state management.
 */

export type NodeStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface AgentNode {
  id: string;
  label: string;
  status: NodeStatus;
  icon: string;
  description: string;
  duration: number; // ms to simulate processing
}

export interface Signal {
  label: string;
  level: 'High' | 'Medium' | 'Low';
  active: boolean;
}

export interface DeliveryLog {
  message: string;
  status: 'pending' | 'active' | 'done';
  timestamp?: string;
}

export interface DecisionLog {
  message: string;
  type: 'channel' | 'timing' | 'tone' | 'strategy';
}

export interface WeightUpdate {
  signal: string;
  from: number;
  to: number;
  timestamp: string;
}

export interface NerveState {
  // Pipeline state
  nodes: AgentNode[];
  isRunning: boolean;
  currentNodeIndex: number;

  // Intelligence outputs
  intentScore: number;
  targetIntentScore: number;
  signals: Signal[];
  personaArchetype: string;
  toneRecommendation: string;
  selectedChannel: string;
  selectedTime: string;
  
  // Decision theatre
  decisions: DecisionLog[];
  
  // Message
  generatedMessage: string;
  messageVisible: string;
  isTyping: boolean;
  
  // Delivery
  deliveryLogs: DeliveryLog[];
  
  // Learning
  weightUpdates: WeightUpdate[];
  learningPulse: boolean;

  // Controls
  fundingSignalEnabled: boolean;
  scenarioReply: 'none' | 'positive' | 'negative';
}

export const initialNodes: AgentNode[] = [
  { id: 'lead-ingestion', label: 'Lead Ingestion', status: 'idle', icon: 'Database', description: 'Importing lead data from CRM', duration: 800 },
  { id: 'signal-scout', label: 'Signal Scout', status: 'idle', icon: 'Radar', description: 'Scanning external signals', duration: 1200 },
  { id: 'intent-scorer', label: 'Intent Scorer', status: 'idle', icon: 'Target', description: 'Calculating purchase intent', duration: 1200 },
  { id: 'persona-analyst', label: 'Persona Analyst', status: 'idle', icon: 'Brain', description: 'Analyzing decision-maker profile', duration: 1200 },
  { id: 'strategy-commander', label: 'Strategy Commander', status: 'idle', icon: 'Cpu', description: 'Selecting optimal approach', duration: 1000 },
  { id: 'content-forge', label: 'Content Forge', status: 'idle', icon: 'Pen', description: 'Generating personalized content', duration: 1500 },
  { id: 'explainer-agent', label: 'Explainer Agent', status: 'idle', icon: 'FileText', description: 'Documenting reasoning chain', duration: 800 },
  { id: 'delivery-agent', label: 'Delivery Agent', status: 'idle', icon: 'Send', description: 'Executing multi-channel delivery', duration: 1200 },
  { id: 'response-monitor', label: 'Response Monitor', status: 'idle', icon: 'Activity', description: 'Tracking engagement signals', duration: 1000 },
  { id: 'learning-loop', label: 'Learning Loop', status: 'idle', icon: 'RefreshCw', description: 'Updating model weights', duration: 800 },
];

export const defaultSignals: Signal[] = [
  { label: 'Series B Funding', level: 'High', active: true },
  { label: 'LinkedIn activity 3 days ago', level: 'High', active: true },
  { label: 'Hiring spike detected', level: 'Medium', active: true },
  { label: 'Tech blog post published', level: 'Medium', active: true },
  { label: 'Job posting for SDRs', level: 'Low', active: true },
];

export const fullMessage = `Hi Sarah,

I noticed Acme Corp just closed your Series B — congratulations! That's a huge milestone.

I've been following your team's growth, and with the hiring push I see on LinkedIn, it looks like you're scaling the go-to-market engine fast.

We built NERVE specifically for teams in your position — it autonomously identifies the highest-intent prospects, crafts hyper-personalized outreach, and continuously learns from every interaction.

Would love to show you how we helped similar companies cut pipeline generation time by 60%.

Open to a quick chat Tuesday at 10?

Best,
Alex`;

export const deliverySequence: DeliveryLog[] = [
  { message: 'Connecting to LinkedIn API…', status: 'pending' },
  { message: 'Authenticating account credentials…', status: 'pending' },
  { message: 'Validating recipient profile…', status: 'pending' },
  { message: 'Message queued for delivery…', status: 'pending' },
  { message: 'Message sent successfully ✓', status: 'pending' },
];

export const initialState: NerveState = {
  nodes: initialNodes.map(n => ({ ...n })),
  isRunning: false,
  currentNodeIndex: -1,
  intentScore: 0,
  targetIntentScore: 87,
  signals: defaultSignals.map(s => ({ ...s })),
  personaArchetype: '',
  toneRecommendation: '',
  selectedChannel: '',
  selectedTime: '',
  decisions: [],
  generatedMessage: fullMessage,
  messageVisible: '',
  isTyping: false,
  deliveryLogs: deliverySequence.map(d => ({ ...d })),
  weightUpdates: [],
  learningPulse: false,
  fundingSignalEnabled: true,
  scenarioReply: 'none',
};

export type NerveAction =
  | { type: 'SET_NODE_STATUS'; nodeId: string; status: NodeStatus }
  | { type: 'START_DEMO' }
  | { type: 'RESET_DEMO' }
  | { type: 'SET_INTENT_SCORE'; score: number }
  | { type: 'SET_PERSONA'; archetype: string; tone: string }
  | { type: 'SET_CHANNEL'; channel: string; time: string }
  | { type: 'ADD_DECISION'; decision: DecisionLog }
  | { type: 'SET_MESSAGE_VISIBLE'; text: string }
  | { type: 'SET_TYPING'; isTyping: boolean }
  | { type: 'SET_DELIVERY_LOG_STATUS'; index: number; status: 'pending' | 'active' | 'done' }
  | { type: 'ADD_WEIGHT_UPDATE'; update: WeightUpdate }
  | { type: 'SET_LEARNING_PULSE'; pulse: boolean }
  | { type: 'TOGGLE_FUNDING_SIGNAL' }
  | { type: 'SET_SCENARIO_REPLY'; reply: 'none' | 'positive' | 'negative' }
  | { type: 'SET_RUNNING'; running: boolean }
  | { type: 'SET_CURRENT_NODE'; index: number }
  | { type: 'SET_SIGNAL_ACTIVE'; index: number; active: boolean }
  | { type: 'SET_TARGET_INTENT_SCORE'; score: number };

export function nerveReducer(state: NerveState, action: NerveAction): NerveState {
  switch (action.type) {
    case 'SET_NODE_STATUS':
      return {
        ...state,
        nodes: state.nodes.map(n =>
          n.id === action.nodeId ? { ...n, status: action.status } : n
        ),
      };
    case 'START_DEMO':
      return {
        ...state,
        isRunning: true,
        currentNodeIndex: 0,
      };
    case 'RESET_DEMO':
      return {
        ...initialState,
        fundingSignalEnabled: state.fundingSignalEnabled,
        signals: state.fundingSignalEnabled 
          ? defaultSignals.map(s => ({ ...s }))
          : defaultSignals.map(s => s.label === 'Series B Funding' ? { ...s, active: false } : { ...s }),
      };
    case 'SET_INTENT_SCORE':
      return { ...state, intentScore: action.score };
    case 'SET_TARGET_INTENT_SCORE':
      return { ...state, targetIntentScore: action.score };
    case 'SET_PERSONA':
      return { ...state, personaArchetype: action.archetype, toneRecommendation: action.tone };
    case 'SET_CHANNEL':
      return { ...state, selectedChannel: action.channel, selectedTime: action.time };
    case 'ADD_DECISION':
      return { ...state, decisions: [...state.decisions, action.decision] };
    case 'SET_MESSAGE_VISIBLE':
      return { ...state, messageVisible: action.text };
    case 'SET_TYPING':
      return { ...state, isTyping: action.isTyping };
    case 'SET_DELIVERY_LOG_STATUS':
      return {
        ...state,
        deliveryLogs: state.deliveryLogs.map((d, i) =>
          i === action.index ? { ...d, status: action.status } : d
        ),
      };
    case 'ADD_WEIGHT_UPDATE':
      return { ...state, weightUpdates: [...state.weightUpdates, action.update] };
    case 'SET_LEARNING_PULSE':
      return { ...state, learningPulse: action.pulse };
    case 'TOGGLE_FUNDING_SIGNAL':
      const newEnabled = !state.fundingSignalEnabled;
      return {
        ...state,
        fundingSignalEnabled: newEnabled,
        signals: state.signals.map(s =>
          s.label === 'Series B Funding' ? { ...s, active: newEnabled } : s
        ),
        targetIntentScore: newEnabled ? 87 : 62,
      };
    case 'SET_SCENARIO_REPLY':
      return { ...state, scenarioReply: action.reply };
    case 'SET_RUNNING':
      return { ...state, isRunning: action.running };
    case 'SET_CURRENT_NODE':
      return { ...state, currentNodeIndex: action.index };
    case 'SET_SIGNAL_ACTIVE':
      return {
        ...state,
        signals: state.signals.map((s, i) =>
          i === action.index ? { ...s, active: action.active } : s
        ),
      };
    default:
      return state;
  }
}
