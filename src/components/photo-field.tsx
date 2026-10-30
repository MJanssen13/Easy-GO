"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";

/** Lado maior e qualidade da foto comprimida (traçado legível, ~150–350 KB). */
const MAX_SIDE = 1600;
const QUALITY = 0.72;

/** Reduz e converte a foto para JPEG (data URL) no próprio aparelho. */
async function compress(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => fail(new Error("Imagem inválida"));
      i.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Sem canvas");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", QUALITY);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Foto anexada ao formulário (ex.: traçado da CTG): tira com a câmera do
 * celular ou escolhe da galeria; vai comprimida no campo oculto `name`.
 */
export function PhotoField({ name, initial }: { name: string; initial?: string | null }) {
  const [value, setValue] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(f?: File) {
    if (!f) return;
    setError(null);
    setBusy(true);
    try {
      setValue(await compress(f));
    } catch {
      setError("Não foi possível ler a imagem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={value} />
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-label="Tirar foto"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Escolher imagem"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      {value ? (
        <div className="relative overflow-hidden rounded-xl border bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Foto anexada" className="max-h-72 w-full object-contain" />
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label="Remover foto"
            className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => camRef.current?.click()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium hover:bg-slate-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Tirar foto
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium hover:bg-slate-50"
          >
            <ImagePlus className="h-4 w-4" /> Escolher da galeria
          </button>
        </div>
      )}
      {error && <p className="text-xs text-rose-700">{error}</p>}
    </div>
  );
}

/** Miniatura que abre a foto em tela cheia. */
export function PhotoThumb({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block overflow-hidden rounded-lg border bg-slate-50"
        aria-label={`Ampliar ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-20 w-32 object-cover" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={alt}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-full max-w-full rounded-lg bg-white object-contain" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            className="absolute right-4 top-4 rounded-full bg-white p-2 shadow"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}
