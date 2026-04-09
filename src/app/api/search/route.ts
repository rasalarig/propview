import { NextRequest, NextResponse } from "next/server";
import { openaiSearch, localSearch, filterSearch } from "@/lib/search";

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

// POST: supports manual filters (from filter panel) with optional text query
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const queryText: string = body.query || "";
    const manualFilters = body.filters || null;

    // If we have manual filters, use filter-based search
    if (manualFilters) {
      const hasAI = !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY;

      let results;
      let mode: string;

      if (queryText.trim() && hasAI) {
        // Combine: AI parses the text, then manual filters override
        results = await openaiSearch(queryText, manualFilters);
        mode = "ai_filters";
      } else if (queryText.trim()) {
        // No AI but has text: use local keyword search + manual filters
        results = await filterSearch(manualFilters, queryText);
        mode = "local";
      } else {
        // No text query: pure filter-based search
        results = await filterSearch(manualFilters);
        mode = "filters";
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
    }

    // No manual filters — same as GET
    if (!queryText.trim()) {
      return NextResponse.json({ results: [], query: "", mode: "empty" });
    }

    const hasAI = !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY;
    let results;
    let mode: string;

    if (hasAI) {
      results = await openaiSearch(queryText);
      mode = "ai_filters";
    } else {
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
    console.error("Search POST error:", error);
    return NextResponse.json(
      { results: [], query: "", mode: "error", error: "Search failed" },
      { status: 500 }
    );
  }
}
