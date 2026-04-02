"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Flame, Snowflake, Sun, CheckCircle, Users, Eye, Heart, Share2,
  MousePointer, MessageSquare, Loader2, ExternalLink, TrendingUp,
} from "lucide-react";

interface LeadInteractions {
  view_half: number;
  view_complete: number;
  like: number;
  share: number;
  click_details: number;
  click_whatsapp: number;
  click_buy: number;
  total: number;
}

interface ScoredLead {
  user_id: number;
  property_id: number;
  user_name: string;
  user_email: string;
  avatar_url: string | null;
  property_title: string;
  property_city: string;
  property_price: number;
  score: number;
  temperature: string;
  interactions: LeadInteractions;
  first_interaction: string;
  last_interaction: string;
}

interface Stats {
  total: number;
  frio: number;
  morno: number;
  quente: number;
  convertido: number;
}

const tempConfig: Record<string, { icon: any; label: string; color: string; bg: string; border: string }> = {
  frio: { icon: Snowflake, label: "Frio", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  morno: { icon: Sun, label: "Morno", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  quente: { icon: Flame, label: "Quente", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  convertido: { icon: CheckCircle, label: "Convertido", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atras`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atras`;
  const days = Math.floor(hours / 24);
  return `${days}d atras`;
}

export function LeadsThermometer() {
  const [leads, setLeads] = useState<ScoredLead[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, frio: 0, morno: 0, quente: 0, convertido: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeads() {
      try {
        const url = filter ? `/api/leads/scored?temperature=${filter}` : "/api/leads/scored";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setLeads(data.leads);
          setStats(data.stats);
        }
      } catch (err) {
        console.error("Failed to fetch leads:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, [filter]);

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

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
            <TrendingUp className="w-7 h-7 text-emerald-400" />
            Funil de Leads
          </h1>
          <p className="text-muted-foreground mt-1">
            {stats.total} leads baseados em engajamento
          </p>
        </div>
        <Link href="/admin">
          <Button variant="outline" size="sm">Voltar ao Painel</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {(["frio", "morno", "quente", "convertido"] as const).map((temp) => {
          const config = tempConfig[temp];
          const Icon = config.icon;
          const count = stats[temp];
          const isActive = filter === temp;
          return (
            <Card
              key={temp}
              className={`p-4 ${config.bg} ${config.border} border text-center cursor-pointer transition-all ${isActive ? "ring-2 ring-offset-2 ring-offset-background" : "hover:scale-105"}`}
              style={isActive ? { ringColor: "currentColor" } : {}}
              onClick={() => setFilter(isActive ? null : temp)}
            >
              <Icon className={`w-5 h-5 ${config.color} mx-auto mb-1`} />
              <p className={`text-2xl font-bold ${config.color}`}>{count}</p>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </Card>
          );
        })}
        <Card
          className={`p-4 bg-card border-border/50 text-center cursor-pointer hover:scale-105 transition-all ${filter === null ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background" : ""}`}
          onClick={() => setFilter(null)}
        >
          <Users className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </Card>
      </div>

      {/* Filter indicator */}
      {filter && (
        <div className="flex items-center gap-2 mb-4">
          <Badge className={`${tempConfig[filter].bg} ${tempConfig[filter].color} ${tempConfig[filter].border}`}>
            {tempConfig[filter].label}
          </Badge>
          <button onClick={() => setFilter(null)} className="text-xs text-muted-foreground hover:text-foreground">
            Limpar filtro
          </button>
        </div>
      )}

      {/* Leads List */}
      {leads.length === 0 ? (
        <Card className="p-12 text-center bg-card border-border/50">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {filter ? "Nenhum lead com esta temperatura." : "Nenhum lead registrado ainda. Os leads sao gerados automaticamente quando usuarios interagem com os reels."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const config = tempConfig[lead.temperature] || tempConfig.frio;
            const TempIcon = config.icon;
            const scorePercent = Math.min(lead.score, 100);

            return (
              <Card key={`${lead.user_id}-${lead.property_id}`} className="p-4 bg-card border-border/50 hover:border-emerald-500/20 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Avatar + Info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {lead.avatar_url ? (
                      <img src={lead.avatar_url} alt={lead.user_name} className="w-10 h-10 rounded-full shrink-0" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center shrink-0 ${config.color} font-bold text-sm`}>
                        {getInitial(lead.user_name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{lead.user_name}</span>
                        <Badge className={`text-xs ${config.bg} ${config.color} ${config.border} flex items-center gap-1`}>
                          <TempIcon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                        <span className={`text-sm font-bold ${config.color}`}>{lead.score} pts</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{lead.user_email}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Link href={`/imoveis/${lead.property_id}`} className="hover:text-emerald-400 truncate">
                          {lead.property_title}
                        </Link>
                        <span>·</span>
                        <span>{lead.property_city}</span>
                        <span>·</span>
                        <span className="text-emerald-400 font-medium">{formatPrice(lead.property_price)}</span>
                      </div>

                      {/* Score bar */}
                      <div className="mt-2 w-full bg-secondary/50 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            lead.temperature === "quente" ? "bg-red-500" :
                            lead.temperature === "morno" ? "bg-amber-500" :
                            lead.temperature === "convertido" ? "bg-emerald-500" :
                            "bg-cyan-500"
                          }`}
                          style={{ width: `${scorePercent}%` }}
                        />
                      </div>

                      {/* Interaction icons */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {lead.interactions.view_complete > 0 && (
                          <span className="flex items-center gap-0.5" title="Views completas">
                            <Eye className="w-3 h-3" /> {lead.interactions.view_complete}
                          </span>
                        )}
                        {lead.interactions.like > 0 && (
                          <span className="flex items-center gap-0.5 text-rose-400" title="Curtidas">
                            <Heart className="w-3 h-3" /> {lead.interactions.like}
                          </span>
                        )}
                        {lead.interactions.share > 0 && (
                          <span className="flex items-center gap-0.5" title="Compartilhamentos">
                            <Share2 className="w-3 h-3" /> {lead.interactions.share}
                          </span>
                        )}
                        {lead.interactions.click_details > 0 && (
                          <span className="flex items-center gap-0.5" title="Cliques em detalhes">
                            <MousePointer className="w-3 h-3" /> {lead.interactions.click_details}
                          </span>
                        )}
                        {lead.interactions.click_whatsapp > 0 && (
                          <span className="flex items-center gap-0.5 text-green-400" title="Cliques WhatsApp">
                            <MessageSquare className="w-3 h-3" /> {lead.interactions.click_whatsapp}
                          </span>
                        )}
                        <span className="text-muted-foreground/60">
                          · {timeAgo(lead.last_interaction)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/imoveis/${lead.property_id}`}>
                      <Button size="sm" variant="outline" className="text-xs">
                        <ExternalLink className="w-3 h-3 mr-1" /> Ver Imovel
                      </Button>
                    </Link>
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
