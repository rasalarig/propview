import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Property {
  id: number;
  title: string;
  price: number;
  area: number;
  type: string;
  city: string;
  neighborhood: string | null;
  characteristics: string | string[];
  description: string;
  details?: string | Record<string, unknown>;
  address?: string;
  state?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseJsonField<T>(field: string | T, fallback: T): T {
  if (typeof field !== "string") return field ?? fallback;
  try {
    return JSON.parse(field) as T;
  } catch {
    return fallback;
  }
}

function buildSystemPrompt(properties: Property[]): string {
  const propertiesText = properties
    .map((p, idx) => {
      const chars = parseJsonField<string[]>(p.characteristics, []);
      const details = parseJsonField<Record<string, unknown>>(p.details ?? "{}", {});

      const bedroomsVal = details.bedrooms ?? null;
      const bathroomsVal = details.bathrooms ?? null;
      const parkingVal = details.parking ?? null;

      const lines: string[] = [
        `## Imóvel ${idx + 1}: ${p.title}`,
        `- **Tipo:** ${p.type}`,
        `- **Preço:** ${formatPrice(p.price)}`,
        `- **Área:** ${p.area} m²`,
        `- **Localização:** ${p.neighborhood ? `${p.neighborhood}, ` : ""}${p.city}${p.state ? ` - ${p.state}` : ""}`,
      ];

      if (bedroomsVal !== null) lines.push(`- **Quartos:** ${bedroomsVal}`);
      if (bathroomsVal !== null) lines.push(`- **Banheiros:** ${bathroomsVal}`);
      if (parkingVal !== null) lines.push(`- **Vagas de garagem:** ${parkingVal}`);

      if (chars.length > 0) {
        lines.push(`- **Características:** ${chars.join(", ")}`);
      }

      if (p.description) {
        lines.push(`- **Descrição:** ${p.description}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");

  return `Você é um consultor imobiliário experiente e prestativo, especializado no mercado brasileiro. Seu papel é ajudar o usuário a comparar os imóveis favoritos listados abaixo, respondendo perguntas e oferecendo análises objetivas e úteis em português (pt-BR).

Seja direto, claro e conciso nas respostas. Use as informações dos imóveis para fazer comparações concretas. Quando relevante, mencione pontos fortes e fracos de cada imóvel. Formate os preços em Reais (R$).

Se o usuário perguntar algo que não está nas informações dos imóveis, seja honesto sobre a limitação dos dados disponíveis.

---

# Imóveis para comparação

${propertiesText}

---

Responda sempre em português (pt-BR). Seja objetivo, útil e amigável.`;
}

// ─── POST /api/favorites/compare ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth check
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let messages: ChatMessage[];
  let properties: Property[];

  try {
    const body = await request.json();
    messages = body.messages ?? [];
    properties = body.properties ?? [];
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  if (!Array.isArray(properties) || properties.length === 0) {
    return NextResponse.json({ error: "properties array is required" }, { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(properties);
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // ── Build the streaming ReadableStream ────────────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function sendChunk(text: string) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
      }

      function sendDone() {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }

      function sendError(msg: string) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.close();
      }

      // ── Try OpenAI first ────────────────────────────────────────────────
      if (openaiKey) {
        try {
          const OpenAI = (await import("openai")).default;
          const client = new OpenAI({ apiKey: openaiKey });

          const openaiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ];

          const streamResponse = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: openaiMessages,
            stream: true,
            temperature: 0.7,
            max_tokens: 1024,
          });

          for await (const chunk of streamResponse) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              sendChunk(text);
            }
          }

          sendDone();
          return;
        } catch (error) {
          console.error("[Compare] OpenAI streaming failed:", error);
          // Fall through to Claude
        }
      }

      // ── Fallback: Claude ────────────────────────────────────────────────
      if (anthropicKey) {
        try {
          const Anthropic = (await import("@anthropic-ai/sdk")).default;
          const client = new Anthropic({ apiKey: anthropicKey });

          const claudeMessages = messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));

          const claudeStream = client.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            system: systemPrompt,
            messages: claudeMessages,
          });

          for await (const event of claudeStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              sendChunk(event.delta.text);
            }
          }

          sendDone();
          return;
        } catch (error) {
          console.error("[Compare] Claude streaming failed:", error);
          sendError("Não foi possível processar sua mensagem. Tente novamente.");
          return;
        }
      }

      // No AI available
      sendError("Serviço de IA não configurado.");
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
