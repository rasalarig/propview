"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import {
  Megaphone,
  Send,
  Target,
  Users,
  Calendar,
  Loader2,
  Plus,
  Flame,
  Snowflake,
  Sun,
  ArrowLeft,
} from "lucide-react";

interface Campaign {
  id: number;
  title: string;
  message: string;
  target_temperature: string;
  property_id: number | null;
  property_title: string | null;
  created_by: number;
  created_at: string;
  recipient_count: string;
  opened_count: string;
}

const tempConfig: Record<
  string,
  { icon: typeof Flame; label: string; color: string; bg: string; border: string }
> = {
  frio: {
    icon: Snowflake,
    label: "Frio",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
  morno: {
    icon: Sun,
    label: "Morno",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  quente: {
    icon: Flame,
    label: "Quente",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  todos: {
    icon: Users,
    label: "Todos",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetTemp, setTargetTemp] = useState("");
  const [propertyId, setPropertyId] = useState("");

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!title.trim() || !message.trim() || !targetTemp) return;

    setCreating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          target_temperature: targetTemp,
          property_id: propertyId ? parseInt(propertyId, 10) : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessMsg(
          `Campanha criada com sucesso! ${data.recipients_count} destinatários adicionados.`
        );
        setTitle("");
        setMessage("");
        setTargetTemp("");
        setPropertyId("");
        setDialogOpen(false);
        fetchCampaigns();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Erro ao criar campanha");
      }
    } catch {
      setErrorMsg("Erro de conexão. Tente novamente.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-emerald-400" />
            Campanhas
          </h1>
          <p className="text-muted-foreground mt-1">
            {campaigns.length} campanha{campaigns.length !== 1 ? "s" : ""} criada
            {campaigns.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/leads">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Leads
            </Button>
          </Link>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nova Campanha
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-emerald-400" />
                  Nova Campanha
                </DialogTitle>
                <DialogDescription>
                  Crie uma campanha direcionada para leads com base na temperatura.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Título</label>
                  <Input
                    placeholder="Ex: Promoção de Verão"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Mensagem</label>
                  <Textarea
                    placeholder="Escreva a mensagem da campanha..."
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    <Target className="w-4 h-4 inline mr-1" />
                    Temperatura Alvo
                  </label>
                  <Select value={targetTemp} onValueChange={setTargetTemp}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a temperatura" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="frio">
                        <span className="flex items-center gap-2">
                          <Snowflake className="w-4 h-4 text-cyan-400" /> Frio
                        </span>
                      </SelectItem>
                      <SelectItem value="morno">
                        <span className="flex items-center gap-2">
                          <Sun className="w-4 h-4 text-amber-400" /> Morno
                        </span>
                      </SelectItem>
                      <SelectItem value="quente">
                        <span className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-red-400" /> Quente
                        </span>
                      </SelectItem>
                      <SelectItem value="todos">
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-400" /> Todos
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    ID do Imóvel (opcional)
                  </label>
                  <Input
                    type="number"
                    placeholder="Filtrar por imóvel específico"
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Deixe em branco para todos os imóveis.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={handleCreate}
                  disabled={creating || !title.trim() || !message.trim() || !targetTemp}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {creating ? "Criando..." : "Criar Campanha"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Success / Error messages */}
      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <Card className="p-12 text-center bg-card border-border/50">
          <Megaphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Nenhuma campanha criada ainda. Clique em &quot;Nova Campanha&quot; para começar.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((campaign) => {
            const config = tempConfig[campaign.target_temperature] || tempConfig.todos;
            const TempIcon = config.icon;
            const recipients = parseInt(campaign.recipient_count, 10) || 0;
            const opened = parseInt(campaign.opened_count, 10) || 0;
            const openRate = recipients > 0 ? Math.round((opened / recipients) * 100) : 0;

            return (
              <Card
                key={campaign.id}
                className="p-5 bg-card border-border/50 hover:border-emerald-500/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-lg leading-tight">{campaign.title}</h3>
                  <Badge
                    className={`shrink-0 ${config.bg} ${config.color} ${config.border} flex items-center gap-1`}
                  >
                    <TempIcon className="w-3 h-3" />
                    {config.label}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {campaign.message}
                </p>

                {campaign.property_title && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Imóvel: <span className="text-emerald-400">{campaign.property_title}</span>
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>
                      {recipients} destinatário{recipients !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Target className="w-4 h-4" />
                    <span>{openRate}% abertos</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground ml-auto">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(campaign.created_at)}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
