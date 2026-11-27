// Regras para ingressos anexados (PDF ou imagem).
// O limite fica abaixo dos 4,5 MB que a Vercel aceita por requisição.
export const MAX_BYTES = 4 * 1024 * 1024;

const SIGNATURES: { mime: string; test: (b: Uint8Array) => boolean }[] = [
  { mime: "application/pdf", test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/gif", test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  {
    mime: "image/webp",
    test: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45,
  },
];

// Descobre o tipo pelo conteúdo do arquivo, não pelo nome.
export function sniffMime(b: Uint8Array): string | null {
  return SIGNATURES.find((s) => s.test(b))?.mime ?? null;
}

export function safeName(name: string): string {
  const clean = name.replace(/[\\/\r\n"]/g, "").trim().slice(0, 120);
  return clean || "ingresso";
}
