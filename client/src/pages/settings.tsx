import { useEffect, useState } from "react";
import { Check, Loader2, Lock, Plug, RefreshCw, Save, Shield, UserPlus, Users } from "lucide-react";
import { useIntegrations, refreshIntegrations } from "@/components/sending-notice";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Segment } from "@/lib/types";

function Section({ title, icon, children, tour }: { title: string; icon: React.ReactNode; children: React.ReactNode; tour?: string }) {
  return (
    <section className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_#000] space-y-4" data-tour={tour}>
      <h2 className="text-sm font-black uppercase flex items-center gap-2">{icon} {title}</h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const { session, catalog, updateOrg } = useAuth();
  const s = session!.org.settings;
  const isDemo = session!.org.isDemo;
  const [orgName, setOrgName] = useState(session!.org.name);
  const [senderName, setSenderName] = useState(s.senderName);
  const [senderTitle, setSenderTitle] = useState(s.senderTitle);
  const [brands, setBrands] = useState(s.brands);
  const [segments, setSegments] = useState<Segment[]>(s.segments);
  const [cities, setCities] = useState(s.cities);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [members, setMembers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invited, setInvited] = useState<{ email: string; tempPassword: string } | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => {});
    api.members().then((m) => setMembers(m.members)).catch(() => {});
  }, []);

  const toggle = <T,>(list: T[], v: T, set: (x: T[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      await updateOrg({ name: orgName, settings: { senderName, senderTitle, brands, segments, cities } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      setInvited(await api.inviteMember(inviteName, inviteEmail));
      setInviteName("");
      setInviteEmail("");
      setMembers((await api.members()).members);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't invite");
    }
  }

  const integrations = useIntegrations();
  const [checking, setChecking] = useState(false);

  // Honour /dashboard/settings#integrations links from the sending notices
  useEffect(() => {
    if (window.location.hash === "#integrations") {
      const t = setTimeout(() => document.getElementById("integrations")?.scrollIntoView({ behavior: "smooth" }), 300);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">Settings</h1>
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Workspace, brand catalog, integrations and team</p>
          </div>
          <button onClick={save} disabled={saving} className="h-10 px-5 border-2 border-black bg-primary text-white font-black uppercase text-xs shadow-[3px_3px_0_0_#000] flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : <Save className="size-4" />} {saved ? "Saved" : "Save changes"}
          </button>
        </div>
        {error && <p className="text-xs font-bold text-white bg-destructive border-2 border-black px-3 py-2">{error}</p>}
        {isDemo && <p className="text-xs font-bold border-2 border-black bg-secondary px-3 py-2">You're in the shared demo workspace. Changes here are visible to other demo visitors and reset periodically.</p>}

        <Section tour="settings-workspace" title="Workspace & sender" icon={<Shield className="size-4" />}>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Company</Label><Input value={orgName} onChange={(e) => setOrgName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Sender name</Label><Input value={senderName} onChange={(e) => setSenderName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Sender title</Label><Input value={senderTitle} onChange={(e) => setSenderTitle(e.target.value)} /></div>
          </div>
        </Section>

        <Section tour="settings-brands" title="Brand catalog" icon={<Plug className="size-4" />}>
          <p className="text-xs font-semibold text-muted-foreground -mt-2">Product lines, specification windows and lead-time estimates the bundler uses for all seven brands. Lead times are planning estimates, not published figures.</p>
          <div className="space-y-2">
            {catalog?.brands.map((b) => {
              const on = brands.includes(b.id);
              return (
                <div key={b.id} className={`border-2 border-black p-3 flex items-start gap-3 ${on ? "bg-white" : "bg-muted/50"}`}>
                  <button type="button" onClick={() => toggle(brands, b.id, setBrands)} className={`mt-0.5 size-5 shrink-0 border-2 border-black flex items-center justify-center ${on ? "bg-black text-white" : "bg-white"}`} aria-label={`Toggle ${b.name}`}>
                    {on && <Check className="size-3" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black flex items-center gap-2"><span className="size-2.5 rounded-full border border-black" style={{ background: b.color }} /> {b.name} <span className="text-[10px] font-bold text-muted-foreground">{catalog.categories[b.category]}</span></p>
                    <p className="text-[11px] font-semibold">{b.productLines.join(" · ")}</p>
                    <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                      Specified at: {b.specifyAt.map((st) => catalog.stages.find((x) => x.id === st)?.label).join(", ")} · Lead time ~{b.leadTimeWeeks} wks · <a href={b.website} target="_blank" rel="noreferrer" className="underline">allhome.in</a>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section tour="settings-targeting" title="Targeting" icon={<Users className="size-4" />}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {catalog && (Object.entries(catalog.segments) as Array<[Segment, { label: string; market: string }]>).map(([id, seg]) => (
                <button key={id} type="button" onClick={() => toggle(segments, id, setSegments)} className={`border-2 border-black px-3 py-1.5 text-xs font-bold ${segments.includes(id) ? "bg-black text-white" : "bg-white"}`}>
                  {seg.market} · {seg.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set([...(catalog?.cities || []), "Pune", "Bengaluru", "Ahmedabad"])).sort().map((c) => (
                <button key={c} type="button" onClick={() => toggle(cities, c, setCities)} className={`border-2 border-black px-2.5 py-1 text-[11px] font-bold ${cities.includes(c) ? "bg-black text-white" : "bg-white"}`}>{c}</button>
              ))}
            </div>
          </div>
        </Section>

        <div id="integrations" className="scroll-mt-4" data-tour="settings-integrations">
          <Section title="Sending channels" icon={<Plug className="size-4" />}>
            <div className="flex flex-wrap items-center gap-2 -mt-2">
              <p className="text-xs font-semibold text-muted-foreground flex-1 min-w-60">
                Messages always go out from the company's own WhatsApp number, email domain and LinkedIn profiles. Each channel needs that account connected with an API key. Until then NERVE simulates the send.
              </p>
              <button onClick={() => { setChecking(true); refreshIntegrations().finally(() => setChecking(false)); }} className="h-8 px-3 border-2 border-black bg-white text-[11px] font-black uppercase flex items-center gap-1.5">
                {checking ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Re-check
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs font-black border-2 border-black px-3 py-2 bg-[#CEEBFC]">
              <Lock className="size-4" /> {health?.simulationMode ? "Demo mode is on: no real messages are sent from this deployment, even on ready channels" : "Live mode: ready channels send for real"}
            </div>
            <div className="space-y-3">
              {integrations?.channels.map((c) => {
                const badge = c.canSendLive ? ["Live", "bg-[#599D77] text-white"] : c.state === "ready" ? ["Ready", "bg-[#CEEBFC]"] : c.state === "needs_setup" ? ["Key added · setup pending", "bg-secondary"] : ["Not connected", "bg-white"];
                return (
                  <div key={c.channel} className="border-2 border-black p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black">{c.label}</p>
                      <a href={c.providerUrl} target="_blank" rel="noreferrer" className="text-[11px] font-bold underline">via {c.provider}</a>
                      <span className={`ml-auto text-[9px] font-black uppercase border-2 border-black px-1.5 py-0.5 ${badge[1]}`}>{badge[0]}</span>
                    </div>
                    <p className="text-[12px] font-semibold">{c.detail}</p>
                    {c.nextSteps.length > 0 && (
                      <ol className="text-[11px] font-semibold list-decimal pl-5 space-y-0.5">
                        {c.nextSteps.map((st) => <li key={st}>{st}</li>)}
                      </ol>
                    )}
                    <p className="text-[11px] font-semibold border-l-4 border-black pl-2 bg-accent py-1"><span className="font-black">For AllHome:</span> {c.forAllHome}</p>
                  </div>
                );
              })}
              {!integrations && <p className="text-xs font-bold flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Checking provider accounts…</p>}
            </div>
          </Section>
        </div>

        <Section title="Research providers (read-only)" icon={<Plug className="size-4" />}>
          <p className="text-xs font-semibold text-muted-foreground -mt-2">
            {integrations?.liveResearch
              ? "Live research is on: real firms are researched with these providers. They only retrieve information and never send anything. On this demo they run on the developer's personal API keys."
              : "Live research is off: missions use fictional sample firms."}
          </p>
          <div className="grid sm:grid-cols-3 gap-2">
            {(integrations?.research || []).map((p) => (
              <div key={p.id} className="border-2 border-black p-2.5 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full border border-black ${p.state === "live" ? "bg-[#599D77]" : p.state === "limited" ? "bg-secondary" : "bg-muted"}`} />
                  <p className="text-xs font-black truncate">{p.label}</p>
                  <span className="ml-auto text-[9px] font-black uppercase">{p.state}</span>
                </div>
                <p className="text-[10px] font-semibold text-muted-foreground">{p.use}</p>
                <p className="text-[10px] font-bold">{p.detail}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section tour="settings-team" title="Team" icon={<UserPlus className="size-4" />}>
          <div className="space-y-1.5">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-xs border-b border-black/10 py-1.5">
                <span className="font-black">{m.name}</span>
                <span className="text-muted-foreground">{m.email}</span>
                <span className="ml-auto text-[10px] font-black uppercase border-2 border-black px-1.5">{m.role}</span>
              </div>
            ))}
          </div>
          {isDemo ? (
            <p className="text-[11px] font-semibold text-muted-foreground">Create your own workspace (Sign up) to invite teammates.</p>
          ) : (
            <form onSubmit={invite} className="flex flex-wrap gap-2">
              <Input className="flex-1 min-w-36" placeholder="Name" value={inviteName} onChange={(e) => setInviteName(e.target.value)} required />
              <Input className="flex-1 min-w-48" type="email" placeholder="Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
              <button className="h-9 px-4 border-2 border-black bg-black text-white font-black uppercase text-xs">Invite</button>
            </form>
          )}
          {invited && <p className="text-xs font-bold border-2 border-black bg-secondary px-3 py-2">Account created for {invited.email}. Temporary password: <span className="font-mono">{invited.tempPassword}</span></p>}
        </Section>
      </div>
    </div>
  );
}
