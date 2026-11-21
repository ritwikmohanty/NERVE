/**
 * Runtime switches shared across agents.
 *
 *  - Live research (LIVE_RESEARCH=true): Tavily / Apollo / Groq are used to RETRIEVE
 *    information about real firms. This never sends anything.
 *  - Sending is controlled separately by SIMULATION_MODE (true = nothing is ever sent).
 *  - While the demo workspace is being seeded, everything stays offline and fictional.
 */
import { config } from "../config.js";

let seeding = false;
export function setSeeding(value: boolean) {
  seeding = value;
}
export function isSeeding(): boolean {
  return seeding;
}

export function tavilyEnabled(): boolean {
  return !seeding && !!config.tavilyApiKey && (config.liveResearch || !config.simulationMode);
}
export function apolloEnabled(): boolean {
  return !seeding && !!config.apolloApiKey && (config.liveResearch || !config.simulationMode);
}
/** True when real firms should be researched instead of using fictional sample data. */
export function liveResearchEnabled(): boolean {
  return !seeding && (config.liveResearch || !config.simulationMode) && (!!config.tavilyApiKey || !!config.apolloApiKey);
}
