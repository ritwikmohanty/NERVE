import type { SSEEvent, SSEEventType } from "../types/index.js";

type SSEClient = {
  id: string;
  orgId: string;
  leadId?: string;
  send: (event: SSEEvent) => void;
  close: () => void;
};

/**
 * Server-Sent Events fan-out, isolated per workspace.
 * Agents emit by leadId; the manager maps each lead to its org so events never
 * leak across workspaces.
 */
class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private leadOrg: Map<string, string> = new Map();

  addClient(client: SSEClient): void {
    this.clients.set(client.id, client);
  }

  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  /** Associate a lead (or a pseudo-id like `pipeline:<org>`) with a workspace. */
  registerLead(leadId: string, orgId: string): void {
    this.leadOrg.set(leadId, orgId);
    if (this.leadOrg.size > 20_000) {
      // keep memory bounded on long-running servers
      const first = this.leadOrg.keys().next().value;
      if (first) this.leadOrg.delete(first);
    }
  }

  orgForLead(leadId: string): string | undefined {
    return this.leadOrg.get(leadId);
  }

  broadcast(event: SSEEvent): void {
    const orgId = event.orgId || this.leadOrg.get(event.leadId);
    if (!orgId) return; // never broadcast events we can't attribute to a workspace
    const payload = { ...event, orgId };
    for (const client of this.clients.values()) {
      if (client.orgId !== orgId) continue;
      if (client.leadId && client.leadId !== event.leadId) continue;
      try {
        client.send(payload);
      } catch {
        this.removeClient(client.id);
      }
    }
  }

  emitAgentStatus(
    leadId: string,
    agentNumber: number,
    agentName: string,
    status: "idle" | "running" | "complete" | "error",
    outputSummary?: string,
    error?: string
  ): void {
    this.broadcast({
      type: "agent_status",
      leadId,
      data: { agentNumber, agentName, status, outputSummary, error },
      timestamp: new Date().toISOString(),
    });
  }

  emit(type: SSEEventType, leadId: string, data: unknown): void {
    this.broadcast({ type, leadId, data, timestamp: new Date().toISOString() });
  }

  getClientCount(orgId?: string): number {
    if (!orgId) return this.clients.size;
    let n = 0;
    for (const c of this.clients.values()) if (c.orgId === orgId) n++;
    return n;
  }
}

export const sseManager = new SSEManager();
