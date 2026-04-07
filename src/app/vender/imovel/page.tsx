"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Plus,
  Trash2,
  Star,
  CheckCircle,
  Home,
  ImageIcon,
} from "lucide-react";

const PROPERTY_TYPES = [
  { value: "terreno", label: "Terreno" },
  { value: "casa", label: "Casa" },
  { value: "apartamento", label: "Apartamento" },
  { value: "comercial", label: "Comercial" },
  { value: "rural", label: "Rural" },
];

const ALL_CHARACTERISTICS = [
  "piscina",
  "churrasqueira",
  "condominio fechado",
  "seguranca 24h",
  "area gourmet",
  "cozinha planejada",
  "quintal",
  "varanda",
  "elevador",
  "academia",
  "playground",
  "salao de festas",
  "ar condicionado",
  "aquecimento",
  "energia solar",
  "poco artesiano",
  "plano",
  "murado",
  "asfalto",
  "iluminacao",
  "proximo escola",
  "proximo comercio",
  "proximo hospital",
  "vista panoramica",
  "area verde",
  "documentacao ok",
];

const inputClass =
  "w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-colors";

const labelClass = "block text-sm font-medium text-foreground mb-1.5";

interface ImageEntry {
  url: string;
  is_cover: boolean;
}

export default function CadastrarImovelPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [checkingSeller, setCheckingSeller] = useState(true);
  const [sellerId, setSellerId] = useState<number | null>(null);

  // Form state - basic info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [price, setPrice] = useState("");
  const [area, setArea] = useState("");

  // Location
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("SP");
  const [neighborhood, setNeighborhood] = useState("");

  // Details (casa/apartamento only)
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [suites, setSuites] = useState("");
  const [parking, setParking] = useState("");

  // Characteristics
  const [selectedChars, setSelectedChars] = useState<string[]>([]);

  // Images (URL-based)
  const [imageEntries, setImageEntries] = useState<ImageEntry[]>([
    { url: "", is_cover: true },
  ]);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ id: number } | null>(null);

  // Check if user is a registered seller
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/vender");
      return;
    }

    fetch("/api/sellers")
      .then((res) => res.json())
      .then((data) => {
        if (data.seller) {
          setSellerId(data.seller.id);
          setCheckingSeller(false);
        } else {
          router.replace("/vender");
        }
      })
      .catch(() => {
        router.replace("/vender");
      });
  }, [user, authLoading, router]);

  const showDetails =
    propertyType === "casa" || propertyType === "apartamento";

  function toggleCharacteristic(char: string) {
    setSelectedChars((prev) =>
      prev.includes(char) ? prev.filter((c) => c !== char) : [...prev, char]
    );
  }

  function addImageField() {
    setImageEntries((prev) => [...prev, { url: "", is_cover: false }]);
  }

  function removeImageField(index: number) {
    setImageEntries((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // If we removed the cover, make the first one cover
      if (next.length > 0 && !next.some((e) => e.is_cover)) {
        next[0].is_cover = true;
      }
      return next;
    });
  }

  function updateImageUrl(index: number, url: string) {
    setImageEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, url } : e))
    );
  }

  function setCover(index: number) {
    setImageEntries((prev) =>
      prev.map((e, i) => ({ ...e, is_cover: i === index }))
    );
  }

  function formatPriceDisplay(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    const num = parseInt(digits, 10);
    return num.toLocaleString("pt-BR");
  }

  function handlePriceChange(raw: string) {
    const digits = raw.replace(/\D/g, "");
    setPrice(digits);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (
      !title.trim() ||
      !description.trim() ||
      !propertyType ||
      !price ||
      !area ||
      !address.trim() ||
      !city.trim()
    ) {
      setError("Preencha todos os campos obrigatorios.");
      return;
    }

    if (!sellerId) {
      setError("Vendedor nao encontrado. Cadastre-se primeiro.");
      return;
    }

    const validImages = imageEntries.filter((e) => e.url.trim());

    const details: Record<string, number> = {};
    if (showDetails) {
      if (bedrooms) details.bedrooms = Number(bedrooms);
      if (bathrooms) details.bathrooms = Number(bathrooms);
      if (suites) details.suites = Number(suites);
      if (parking) details.parking = Number(parking);
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/properties/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          type: propertyType,
          price: Number(price),
          area: Number(area),
          address: address.trim(),
          city: city.trim(),
          state: state.trim() || "SP",
          neighborhood: neighborhood.trim() || null,
          characteristics: selectedChars.length > 0 ? selectedChars : null,
          details: Object.keys(details).length > 0 ? details : null,
          seller_id: sellerId,
          imageUrls: validImages,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao cadastrar imovel.");
        return;
      }

      setSuccess({ id: data.property.id });
    } catch {
      setError("Erro de conexao. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || checkingSeller) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background pb-24 md:pb-8">
        <div className="container mx-auto px-4 pt-24 md:pt-24 max-w-lg">
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">
              Imovel cadastrado com sucesso!
            </h2>
            <p className="text-muted-foreground text-sm">
              Seu imovel ja esta visivel para compradores na plataforma.
            </p>
            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={() => router.push(`/imovel/${success.id}`)}
                className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium rounded-xl"
              >
                Ver Imovel
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/vender/imovel")}
                className="w-full h-11 rounded-xl"
              >
                Cadastrar Outro
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <div className="container mx-auto px-4 pt-24 md:pt-24 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-4">
            <Home className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Cadastrar Imovel
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Preencha as informacoes do seu imovel para anuncia-lo na plataforma.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Informacoes Basicas */}
          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground border-b border-border/30 pb-2">
              Informacoes Basicas
            </h2>

            <div>
              <label className={labelClass}>
                Titulo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Casa moderna com piscina no centro"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Descricao <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o imovel em detalhes..."
                rows={4}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Tipo <span className="text-red-400">*</span>
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className={inputClass}
              >
                <option value="">Selecione o tipo</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Preco R$ <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatPriceDisplay(price)}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  placeholder="500.000"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Area m² <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="150"
                  min="0"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Section: Localizacao */}
          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground border-b border-border/30 pb-2">
              Localizacao
            </h2>

            <div>
              <label className={labelClass}>
                Endereco <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, numero"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Cidade <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Sao Paulo"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Estado</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="SP"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Bairro</label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ex: Centro"
                className={inputClass}
              />
            </div>
          </div>

          {/* Section: Detalhes (only for casa/apartamento) */}
          {showDetails && (
            <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground border-b border-border/30 pb-2">
                Detalhes
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Quartos</label>
                  <input
                    type="number"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    placeholder="0"
                    min="0"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Banheiros</label>
                  <input
                    type="number"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    placeholder="0"
                    min="0"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Suites</label>
                  <input
                    type="number"
                    value={suites}
                    onChange={(e) => setSuites(e.target.value)}
                    placeholder="0"
                    min="0"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Vagas de Garagem</label>
                  <input
                    type="number"
                    value={parking}
                    onChange={(e) => setParking(e.target.value)}
                    placeholder="0"
                    min="0"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section: Caracteristicas */}
          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground border-b border-border/30 pb-2">
              Caracteristicas
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_CHARACTERISTICS.map((char) => (
                <label
                  key={char}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                    selectedChars.includes(char)
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
                      : "border-border/30 bg-background/50 text-muted-foreground hover:border-border/60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedChars.includes(char)}
                    onChange={() => toggleCharacteristic(char)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      selectedChars.includes(char)
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-border/50"
                    }`}
                  >
                    {selectedChars.includes(char) && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="capitalize leading-tight">{char}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section: Fotos */}
          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground border-b border-border/30 pb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Links das Fotos
            </h2>
            <p className="text-xs text-muted-foreground">
              Cole links de imagens (ex: Unsplash, Imgur). A primeira foto sera
              a capa do anuncio. Clique na estrela para alterar a foto de capa.
            </p>

            <div className="space-y-3">
              {imageEntries.map((entry, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={entry.url}
                        onChange={(e) => updateImageUrl(index, e.target.value)}
                        placeholder="https://exemplo.com/foto.jpg"
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => setCover(index)}
                        title={
                          entry.is_cover
                            ? "Foto de capa"
                            : "Definir como capa"
                        }
                        className={`flex-shrink-0 p-2.5 rounded-lg border transition-colors ${
                          entry.is_cover
                            ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-400"
                            : "border-border/50 text-muted-foreground hover:text-yellow-400 hover:border-yellow-500/40"
                        }`}
                      >
                        <Star
                          className="w-4 h-4"
                          fill={entry.is_cover ? "currentColor" : "none"}
                        />
                      </button>
                      {imageEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeImageField(index)}
                          className="flex-shrink-0 p-2.5 rounded-lg border border-border/50 text-muted-foreground hover:text-red-400 hover:border-red-500/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {/* Thumbnail preview */}
                    {entry.url.trim() && (
                      <div className="relative w-20 h-14 rounded-md overflow-hidden border border-border/30 bg-background">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={entry.url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                        {entry.is_cover && (
                          <span className="absolute top-0.5 left-0.5 text-[9px] bg-yellow-500 text-black font-bold px-1 rounded">
                            CAPA
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addImageField}
              className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar mais fotos
            </button>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium rounded-xl text-base"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Cadastrar Imovel"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
