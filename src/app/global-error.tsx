"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0e17", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <h2 style={{ fontSize: 24, marginBottom: 8 }}>Algo deu errado</h2>
            <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>{error.message || "Erro inesperado"}</p>
            <button
              onClick={reset}
              style={{ padding: "10px 24px", borderRadius: 8, background: "#10b981", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
