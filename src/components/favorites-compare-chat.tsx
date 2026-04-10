"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Sparkles, X, Loader2 } from "lucide-react";

interface FavoriteProperty {
  id: number;
  title: string;
  description: string;
  price: number;
  area: number;
  type: string;
  address: string;
  city: string;
  state: string;
  neighborhood: string | null;
  characteristics: string;
  coverImage: string | null;
  likes_count: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Qual o melhor custo-benefício?",
  "Compare os preços por m²",
  "Qual imóvel tem mais vantagens?",
  "Resuma as diferenças principais",
];

function renderMarkdown(text: string) {
  // Replace **bold** with <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function FavoritesCompareChat({ properties }: { properties: FavoriteProperty[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming || properties.length < 2) return;

    const userMessage: ChatMessage = { role: "user", content: text.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsStreaming(true);

    // Add empty assistant message to stream into
    const assistantPlaceholder: ChatMessage = { role: "assistant", content: "" };
    setMessages([...nextMessages, assistantPlaceholder]);

    try {
      const res = await fetch("/api/favorites/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, properties }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Erro ao obter resposta. Tente novamente.",
          };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              accumulated += parsed.text;
              const snapshot = accumulated;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: snapshot,
                };
                return updated;
              });
            } else if (parsed.error) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: parsed.error,
                };
                return updated;
              });
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Erro de conexão. Verifique sua internet e tente novamente.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="mt-10">
      {/* Toggle button */}
      <div className="flex justify-center mb-4">
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-900/30 text-sm"
        >
          {isOpen ? (
            <>
              <X className="w-4 h-4" />
              Fechar
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Comparar com IA
            </>
          )}
        </button>
      </div>

      {/* Chat panel */}
      {isOpen && (
        <div className="rounded-2xl bg-card border border-border/50 overflow-hidden shadow-xl">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-secondary/30">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">Comparação com IA</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {properties.length} imóveis
            </span>
          </div>

          {/* Messages area */}
          <div className="flex flex-col h-[380px]">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!hasMessages && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <Sparkles className="w-8 h-8 text-emerald-400/60" />
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Pergunte sobre seus imóveis favoritos e receba uma análise comparativa com IA.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        disabled={isStreaming}
                        className="text-xs px-3 py-1.5 rounded-full border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hasMessages && (
                <>
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-emerald-600 text-white rounded-br-sm"
                            : "bg-secondary text-foreground rounded-bl-sm"
                        }`}
                      >
                        {msg.role === "assistant" && !msg.content && isStreaming ? (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                          </span>
                        ) : (
                          <span className="whitespace-pre-wrap">{renderMarkdown(msg.content)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input area */}
            <div className="border-t border-border/50 p-3 bg-secondary/20">
              <div className="flex gap-2 items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isStreaming}
                  placeholder="Pergunte sobre seus imóveis favoritados..."
                  className="flex-1 bg-background/60 border border-border/50 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground/60 transition-colors"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={isStreaming || !input.trim()}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
