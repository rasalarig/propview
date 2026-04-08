import { NextRequest, NextResponse } from "next/server";
import { openaiSearch, localSearch } from "@/lib/search";

export async function GET(request: NextRequest) {
  const queryText = request.nextUrl.searchParams.get("q");

  if (!queryText || queryText.trim().length === 0) {
    return NextResponse.json({ results: [], query: "", mode: "empty" });
  }

  try {
    const hasAI = !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY;

    let results;
    let mode: string;

    if (hasAI) {
      // Two-step AI search: AI generates filters, then we apply them locally
      results = await openaiSearch(queryText);
      mode = "ai_filters";
    } else {
      // No AI keys — pure keyword fallback
      results = await localSearch(queryText);
      mode = "local";
    }

    return NextResponse.json({
      results: results.map((r) => ({
        ...r.property,
        characteristics: JSON.parse(r.property.characteristics || "[]"),
        details: JSON.parse(r.property.details || "{}"),
        score: r.score,
        matchReasons: r.matchReasons,
      })),
      query: queryText,
      mode,
      total: results.length,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { results: [], query: queryText, mode: "error", error: "Search failed" },
      { status: 500 }
    );
  }
}
