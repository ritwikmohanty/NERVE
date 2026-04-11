/**
 * NERVE Orchestration Engine
 * Controls the staged demo sequence — processes each agent node
 * with proper timing, parallel execution, and state updates.
 */
import type { Dispatch } from 'react';
import type { NerveAction, NerveState } from '../store/nerve-store';
import { fullMessage } from '../store/nerve-store';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function runDemoSequence(
  state: NerveState,
  dispatch: Dispatch<NerveAction>,
) {
  dispatch({ type: 'RESET_DEMO' });
  await sleep(300);
  dispatch({ type: 'START_DEMO' });

  const hasFunding = state.fundingSignalEnabled;
  const targetScore = hasFunding ? 87 : 62;

  // Phase 1: Lead Ingestion
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'lead-ingestion', status: 'processing' });
  dispatch({ type: 'SET_CURRENT_NODE', index: 0 });
  await sleep(800);
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'lead-ingestion', status: 'completed' });

  // Phase 2: Parallel — Signal Scout + Intent Scorer + Persona Analyst
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'signal-scout', status: 'processing' });
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'intent-scorer', status: 'processing' });
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'persona-analyst', status: 'processing' });
  dispatch({ type: 'SET_CURRENT_NODE', index: 1 });

  // Animate score counting up
  const scoreSteps = 30;
  for (let i = 1; i <= scoreSteps; i++) {
    await sleep(40);
    dispatch({ type: 'SET_INTENT_SCORE', score: Math.round((targetScore / scoreSteps) * i) });
  }

  await sleep(400);
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'signal-scout', status: 'completed' });

  await sleep(300);
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'intent-scorer', status: 'completed' });

  await sleep(200);
  dispatch({ type: 'SET_PERSONA', archetype: 'Strategic Executive', tone: 'Challenger' });
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'persona-analyst', status: 'completed' });

  // Phase 3: Strategy Commander
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'strategy-commander', status: 'processing' });
  dispatch({ type: 'SET_CURRENT_NODE', index: 4 });
  await sleep(500);

  dispatch({ type: 'ADD_DECISION', decision: { 
    message: 'LinkedIn selected — recent profile activity detected 3 days ago', 
    type: 'channel' 
  }});
  await sleep(400);
  dispatch({ type: 'ADD_DECISION', decision: { 
    message: 'Tuesday 10:00 AM chosen — highest engagement window for executive personas', 
    type: 'timing' 
  }});
  await sleep(400);
  dispatch({ type: 'ADD_DECISION', decision: { 
    message: 'Challenger tone selected — optimal for strategic executive archetype', 
    type: 'tone' 
  }});
  if (hasFunding) {
    await sleep(300);
    dispatch({ type: 'ADD_DECISION', decision: { 
      message: 'Funding signal leveraged as primary hook — high correlation with purchase intent', 
      type: 'strategy' 
    }});
  }

  dispatch({ type: 'SET_CHANNEL', channel: 'LinkedIn InMail', time: 'Tuesday 10:00 AM' });
  await sleep(300);
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'strategy-commander', status: 'completed' });

  // Phase 4: Content Forge — typing animation
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'content-forge', status: 'processing' });
  dispatch({ type: 'SET_CURRENT_NODE', index: 5 });
  dispatch({ type: 'SET_TYPING', isTyping: true });

  const msg = fullMessage;
  for (let i = 0; i <= msg.length; i += 3) {
    dispatch({ type: 'SET_MESSAGE_VISIBLE', text: msg.slice(0, i) });
    await sleep(15);
  }
  dispatch({ type: 'SET_MESSAGE_VISIBLE', text: msg });
  dispatch({ type: 'SET_TYPING', isTyping: false });
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'content-forge', status: 'completed' });

  // Phase 5: Explainer Agent
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'explainer-agent', status: 'processing' });
  dispatch({ type: 'SET_CURRENT_NODE', index: 6 });
  await sleep(800);
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'explainer-agent', status: 'completed' });

  // Phase 6: Delivery Agent
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'delivery-agent', status: 'processing' });
  dispatch({ type: 'SET_CURRENT_NODE', index: 7 });
  for (let i = 0; i < 5; i++) {
    dispatch({ type: 'SET_DELIVERY_LOG_STATUS', index: i, status: 'active' });
    await sleep(600);
    dispatch({ type: 'SET_DELIVERY_LOG_STATUS', index: i, status: 'done' });
  }
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'delivery-agent', status: 'completed' });

  // Phase 7: Response Monitor
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'response-monitor', status: 'processing' });
  dispatch({ type: 'SET_CURRENT_NODE', index: 8 });
  await sleep(1000);
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'response-monitor', status: 'completed' });

  // Phase 8: Learning Loop
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'learning-loop', status: 'processing' });
  dispatch({ type: 'SET_CURRENT_NODE', index: 9 });
  dispatch({ type: 'SET_LEARNING_PULSE', pulse: true });
  await sleep(500);
  dispatch({ type: 'ADD_WEIGHT_UPDATE', update: { 
    signal: 'Funding signal weight', from: 40, to: hasFunding ? 55 : 35, 
    timestamp: new Date().toLocaleTimeString() 
  }});
  await sleep(500);
  dispatch({ type: 'ADD_WEIGHT_UPDATE', update: { 
    signal: 'LinkedIn activity weight', from: 30, to: 42, 
    timestamp: new Date().toLocaleTimeString() 
  }});
  await sleep(500);
  dispatch({ type: 'SET_LEARNING_PULSE', pulse: false });
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'learning-loop', status: 'completed' });

  dispatch({ type: 'SET_RUNNING', running: false });
}

export async function simulatePositiveReply(dispatch: Dispatch<NerveAction>) {
  dispatch({ type: 'SET_SCENARIO_REPLY', reply: 'positive' });
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'response-monitor', status: 'processing' });
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'learning-loop', status: 'processing' });
  dispatch({ type: 'SET_LEARNING_PULSE', pulse: true });

  await sleep(800);
  dispatch({ type: 'ADD_DECISION', decision: { 
    message: '✓ Positive reply detected — Challenger approach validated for executive persona', 
    type: 'strategy' 
  }});

  await sleep(600);
  dispatch({ type: 'ADD_WEIGHT_UPDATE', update: { 
    signal: 'Challenger tone weight', from: 45, to: 62, 
    timestamp: new Date().toLocaleTimeString() 
  }});
  dispatch({ type: 'ADD_WEIGHT_UPDATE', update: { 
    signal: 'LinkedIn channel weight', from: 50, to: 65, 
    timestamp: new Date().toLocaleTimeString() 
  }});

  await sleep(600);
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'response-monitor', status: 'completed' });
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'learning-loop', status: 'completed' });
  dispatch({ type: 'SET_LEARNING_PULSE', pulse: false });
}

export async function simulateNegativeReply(dispatch: Dispatch<NerveAction>) {
  dispatch({ type: 'SET_SCENARIO_REPLY', reply: 'negative' });
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'response-monitor', status: 'processing' });
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'learning-loop', status: 'processing' });
  dispatch({ type: 'SET_LEARNING_PULSE', pulse: true });

  await sleep(800);
  dispatch({ type: 'ADD_DECISION', decision: { 
    message: '✗ Negative reply — adjusting approach. De-prioritizing Challenger tone for this segment.', 
    type: 'strategy' 
  }});

  await sleep(600);
  dispatch({ type: 'ADD_WEIGHT_UPDATE', update: { 
    signal: 'Challenger tone weight', from: 45, to: 30, 
    timestamp: new Date().toLocaleTimeString() 
  }});
  dispatch({ type: 'ADD_WEIGHT_UPDATE', update: { 
    signal: 'Email fallback weight', from: 25, to: 40, 
    timestamp: new Date().toLocaleTimeString() 
  }});

  await sleep(600);
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'response-monitor', status: 'completed' });
  dispatch({ type: 'SET_NODE_STATUS', nodeId: 'learning-loop', status: 'completed' });
  dispatch({ type: 'SET_LEARNING_PULSE', pulse: false });
}
