"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold mb-2">Algo deu errado</h2>
        <p className="text-muted-foreground text-sm mb-6">{error.message || "Erro inesperado"}</p>
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
