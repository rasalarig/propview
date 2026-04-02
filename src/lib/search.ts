import { getAll } from "./db";

interface Property {
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
  details: string;
  status: string;
}

interface SearchResult {
  property: Property;
  score: number;
  matchReasons: string[];
}

// Normalize text for comparison (remove accents, lowercase)
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Extract all searchable text from a property
function getSearchableText(property: Property): string {
  const chars = JSON.parse(property.characteristics || "[]") as string[];
  const details = JSON.parse(property.details || "{}");

  const parts = [
    property.title,
    property.description,
    property.type,
    property.address,
    property.city,
    property.state,
    property.neighborhood || "",
    ...chars,
    ...Object.entries(details).map(([k, v]) => `${k} ${v}`),
  ];

  return normalize(parts.join(" "));
}

// Smart local search with scoring
export async function localSearch(queryText: string): Promise<SearchResult[]> {
  const properties = await getAll(
    "SELECT * FROM properties WHERE status = 'active'"
  ) as Property[];
  const normalizedQuery = normalize(queryText);
  const queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length > 2);

  // Common synonyms/related terms in Portuguese real estate
  const synonyms: Record<string, string[]> = {
    barato: ["baixo preco", "economico", "acessivel"],
    caro: ["alto padrao", "luxo", "premium"],
    grande: ["amplo", "espacoso", "generoso"],
    pequeno: ["compacto", "menor"],
    seguro: ["seguranca", "condominio fechado", "portaria"],
    verde: ["arvores", "vegetacao", "mata", "jardim", "area verde"],
    arvore: [
      "arvores",
      "frutiferas",
      "mangueira",
      "jabuticabeira",
      "vegetacao",
    ],
    fruta: ["frutiferas", "mangueira", "jabuticabeira", "pomar"],
    perto: ["proximo", "perto de"],
    escola: ["proximo escola", "perto escola"],
    comercio: ["proximo comercio", "perto comercio"],
    plano: ["terreno plano", "sem aclive"],
    vista: ["vista panoramica", "vista privilegiada"],
    tranquilo: ["calmo", "residencial", "rua sem saida"],
    familia: ["familiar", "seguro", "criancas"],
    natureza: ["arvores", "verde", "serra", "mata", "area verde"],
    condominio: ["condominio fechado", "seguranca 24h"],
    documentacao: ["documentacao ok", "escritura", "pronto transferencia"],
    construir: ["pronto para construir", "terreno plano"],
  };

  const results: SearchResult[] = [];

  for (const property of properties) {
    const searchableText = getSearchableText(property);
    const chars = JSON.parse(property.characteristics || "[]") as string[];
    const normalizedChars = chars.map(normalize);
    let score = 0;
    const matchReasons: string[] = [];

    // Direct word matching
    for (const word of queryWords) {
      if (searchableText.includes(word)) {
        score += 10;

        // Check if it matches a characteristic specifically (higher weight)
        if (normalizedChars.some((c) => c.includes(word))) {
          score += 5;
          const matchedChar = chars.find((_, i) =>
            normalizedChars[i].includes(word)
          );
          if (matchedChar) matchReasons.push(`Possui "${matchedChar}"`);
        }

        // Title match (highest weight)
        if (normalize(property.title).includes(word)) {
          score += 8;
        }

        // City/location match
        if (
          normalize(property.city).includes(word) ||
          normalize(property.neighborhood || "").includes(word)
        ) {
          score += 7;
          matchReasons.push(
            `Localizado em ${property.city}${property.neighborhood ? `, ${property.neighborhood}` : ""}`
          );
        }

        // Type match
        if (normalize(property.type).includes(word)) {
          score += 10;
          matchReasons.push(`Tipo: ${property.type}`);
        }
      }

      // Synonym matching
      const wordSynonyms = synonyms[word] || [];
      for (const synonym of wordSynonyms) {
        if (searchableText.includes(normalize(synonym))) {
          score += 7;
          const matchedChar = chars.find((_, i) =>
            normalizedChars[i].includes(normalize(synonym))
          );
          if (matchedChar) matchReasons.push(`Possui "${matchedChar}"`);
        }
      }
    }

    // Price-related queries
    const priceMatch = queryText.match(
      /(?:ate|até|menos de|abaixo de|max|máximo)\s*(?:r\$?)?\s*([\d.,]+)/i
    );
    if (priceMatch) {
      const maxPrice = parseFloat(
        priceMatch[1].replace(/\./g, "").replace(",", ".")
      );
      if (property.price <= maxPrice) {
        score += 15;
        matchReasons.push(
          `Preco dentro do orcamento (${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(property.price)})`
        );
      }
    }

    // Area-related queries
    const areaMatch = queryText.match(
      /(?:mais de|acima de|minimo|mínimo)\s*(\d+)\s*m/i
    );
    if (areaMatch) {
      const minArea = parseInt(areaMatch[1]);
      if (property.area >= minArea) {
        score += 12;
        matchReasons.push(`Area de ${property.area}m2 atende o minimo`);
      }
    }

    // If no specific reasons found but score > 0, add generic
    if (score > 0 && matchReasons.length === 0) {
      matchReasons.push("Corresponde a sua busca por termos gerais");
    }

    // Deduplicate reasons
    const uniqueReasons = Array.from(new Set(matchReasons));

    if (score > 0) {
      results.push({ property, score, matchReasons: uniqueReasons });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  return results;
}

// AI-enhanced search using OpenAI GPT
export async function openaiSearch(queryText: string): Promise<SearchResult[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return aiSearch(queryText); // Try Claude, then local
  }

  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey });

    const properties = await getAll(
      "SELECT * FROM properties WHERE status = 'active'"
    ) as Property[];

    if (properties.length === 0) return [];

    const propertySummaries = properties.map((p) => {
      const chars = JSON.parse(p.characteristics || "[]");
      const details = JSON.parse(p.details || "{}");
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        price: p.price,
        area: p.area,
        type: p.type,
        city: p.city,
        state: p.state,
        neighborhood: p.neighborhood,
        address: p.address,
        characteristics: chars,
        details,
      };
    });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Voce e um assistente de busca imobiliaria. Analise os imoveis disponiveis e determine quais combinam com o pedido do usuario.

REGRAS:
1. EXCLUSOES EXPLICITAS: se o usuario disse "fora de condominio", "sem piscina", "nao quero X" — EXCLUA imoveis que tenham essa caracteristica. So exclua o que o usuario EXPLICITAMENTE pediu para excluir.
2. CRITERIOS POSITIVOS: "casa" = tipo casa, "terrea" = caracteristica terrea, "3 quartos" = bedrooms 3, etc. Inclua imoveis que atendem os criterios positivos.
3. NAO invente exclusoes que o usuario nao pediu. Se ele disse "casa fora de condominio", inclua casas com piscina, com garagem, etc — so exclua condominio.
4. Se um imovel atende os criterios positivos e nao viola nenhuma exclusao, INCLUA com score proporcional.
5. Responda em portugues brasileiro.

Retorne APENAS JSON: { "results": [{ "id": number, "score": 0-100, "reasons": ["razao 1", "razao 2"] }] }
Se nenhum imovel combinar, retorne { "results": [] }.`,
        },
        {
          role: "user",
          content: `Busca do usuario: "${queryText}"

Imoveis disponiveis:
${JSON.stringify(propertySummaries, null, 2)}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return localSearch(queryText);

    const parsed = JSON.parse(content) as {
      results: Array<{ id: number; score: number; reasons: string[] }>;
    };

    return parsed.results
      .map((r) => {
        const property = properties.find((p) => p.id === r.id);
        if (!property) return null;
        return {
          property,
          score: r.score,
          matchReasons: r.reasons,
        };
      })
      .filter((r): r is SearchResult => r !== null)
      .sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error("OpenAI search failed, falling back:", error);
    return aiSearch(queryText); // Try Claude, then local
  }
}

// AI-enhanced search using Claude API
export async function aiSearch(queryText: string): Promise<SearchResult[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Fallback to local search
    return localSearch(queryText);
  }

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const properties = await getAll(
      "SELECT * FROM properties WHERE status = 'active'"
    ) as Property[];

    // Build property summaries for the AI
    const propertySummaries = properties.map((p) => {
      const chars = JSON.parse(p.characteristics || "[]");
      const details = JSON.parse(p.details || "{}");
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        price: p.price,
        area: p.area,
        type: p.type,
        city: p.city,
        neighborhood: p.neighborhood,
        characteristics: chars,
        details,
      };
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Voce e um assistente de busca imobiliaria PRECISO e ASSERTIVO. O usuario busca:

"${queryText}"

REGRAS OBRIGATORIAS:
1. EXCLUSOES sao absolutas. "fora de condominio" = EXCLUIR qualquer imovel em condominio. "sem piscina" = EXCLUIR imoveis com piscina. Imoveis que violam exclusoes NAO aparecem nos resultados.
2. Retorne SOMENTE imoveis que atendem TODOS os criterios positivos E nao violam NENHUM criterio negativo.
3. Prefira PRECISAO a QUANTIDADE. Se so 1 imovel combina, retorne so 1. Se nenhum combina, retorne array vazio.
4. Score alto (80-100) = atende todos os criterios. NAO inclua imoveis com score abaixo de 50.

Imoveis disponiveis:
${JSON.stringify(propertySummaries, null, 2)}

Retorne APENAS um JSON array: [{ "id": number, "score": 0-100, "reasons": ["razao 1"] }]
Se nenhum combinar, retorne [].`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") return localSearch(queryText);

    const aiResults = JSON.parse(content.text) as Array<{
      id: number;
      score: number;
      reasons: string[];
    }>;

    return aiResults
      .map((r) => {
        const property = properties.find((p) => p.id === r.id);
        if (!property) return null;
        return {
          property,
          score: r.score,
          matchReasons: r.reasons,
        };
      })
      .filter((r): r is SearchResult => r !== null)
      .sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error("AI search failed, falling back to local:", error);
    return localSearch(queryText);
  }
}
