import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  User,
  Briefcase,
  MapPin,
  Mail,
  Linkedin,
  MessageSquare,
  Loader2,
  Target,
  Search,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";

export default function NewLeadPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Targeted fields
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [location, setLocation] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactLinkedIn, setContactLinkedIn] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  // Discovery fields
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [targetIndustries, setTargetIndustries] = useState("");
  const [targetGeo, setTargetGeo] = useState("");

  async function handleTargeted(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return setError("Company name is required");
    setLoading(true);
    setError("");
    try {
      const res = await api.executeTargeted({
        companyName: companyName.trim(),
        contactName: contactName.trim() || undefined,
        contactTitle: contactTitle.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactLinkedIn: contactLinkedIn.trim() || undefined,
        location: location.trim() || undefined,
        additionalContext: additionalContext.trim() || undefined,
      });
      navigate(`/pipeline/${res.pipelineId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start pipeline");
    } finally {
      setLoading(false);
    }
  }

  async function handleDiscovery(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim() || !productDescription.trim() || !targetIndustries.trim())
      return setError("Product name, description, and industries are required");
    setLoading(true);
    setError("");
    try {
      const res = await api.discover({
        productName: productName.trim(),
        productDescription: productDescription.trim(),
        targetIndustries: targetIndustries.split(",").map((s) => s.trim()).filter(Boolean),
        targetGeographies: targetGeo ? targetGeo.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        maxResults: 3,
      });
      navigate(`/pipeline/${res.pipelineId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start discovery");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Launch Pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start a targeted execution or run discovery mode to find and process best-fit companies.
          </p>
        </div>

        <Tabs defaultValue="targeted" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="targeted" className="gap-2">
              <Target className="size-4" /> Targeted
            </TabsTrigger>
            <TabsTrigger value="discovery" className="gap-2">
              <Search className="size-4" /> Discovery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="targeted" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="size-4" /> Targeted Lead Input
                </CardTitle>
                <CardDescription>
                  Submit a specific lead. Enrichment and orchestration continue automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTargeted} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="company" className="text-xs text-muted-foreground">Company Name *</Label>
                      <Input
                        id="company"
                        placeholder="Stripe"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact" className="text-xs text-muted-foreground">Contact Name</Label>
                      <Input
                        id="contact"
                        placeholder="Patrick Collison"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="title" className="text-xs text-muted-foreground">Contact Title</Label>
                      <Input
                        id="title"
                        placeholder="VP Engineering"
                        value={contactTitle}
                        onChange={(e) => setContactTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="location" className="text-xs text-muted-foreground">Location</Label>
                      <Input
                        id="location"
                        placeholder="Mumbai, India"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs text-muted-foreground">Contact Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@company.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="linkedin" className="text-xs text-muted-foreground">LinkedIn URL</Label>
                      <Input
                        id="linkedin"
                        placeholder="https://linkedin.com/in/name"
                        value={contactLinkedIn}
                        onChange={(e) => setContactLinkedIn(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="context" className="text-xs text-muted-foreground">Additional Context</Label>
                    <Textarea
                      id="context"
                      rows={3}
                      placeholder="Any extra business context for strategy and messaging"
                      value={additionalContext}
                      onChange={(e) => setAdditionalContext(e.target.value)}
                    />
                  </div>

                  {error ? (
                    <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {error}
                    </p>
                  ) : null}

                  <Button type="submit" disabled={loading} className="w-full gap-2">
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Starting pipeline
                      </>
                    ) : (
                      <>
                        <Rocket className="size-4" /> Run 10-Agent Pipeline
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discovery" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="size-4" /> Discovery Mode
                </CardTitle>
                <CardDescription>
                  Describe your product and target market. The system will discover and evaluate prospects.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleDiscovery} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs text-muted-foreground">Product Name *</Label>
                      <Input
                        placeholder="CortexReach"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs text-muted-foreground">Product Description *</Label>
                      <Textarea
                        rows={3}
                        placeholder="Autonomous outreach system with explainable multi-agent orchestration"
                        value={productDescription}
                        onChange={(e) => setProductDescription(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Target Industries * (comma separated)</Label>
                      <Input
                        placeholder="SaaS, FinTech, HealthTech"
                        value={targetIndustries}
                        onChange={(e) => setTargetIndustries(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Target Geographies</Label>
                      <Input
                        placeholder="India, UAE, UK"
                        value={targetGeo}
                        onChange={(e) => setTargetGeo(e.target.value)}
                      />
                    </div>
                  </div>

                  {error ? (
                    <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {error}
                    </p>
                  ) : null}

                  <Button type="submit" disabled={loading} className="w-full gap-2">
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Discovering prospects
                      </>
                    ) : (
                      <>
                        <Search className="size-4" /> Discover and Run
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Pipeline Stages</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            <p>
              Enrichment → Signals → Intent + Persona → Strategy → Content + Rationale → Delivery → Response → Learning.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
