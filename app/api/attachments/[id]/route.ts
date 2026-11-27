import { NextResponse } from "next/server";
import { deleteAttachment, getAttachment } from "@/lib/db";
import { checkPin } from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Devolve o arquivo. Com ?download=1 o navegador salva em vez de abrir.
export async function GET(req: Request, { params }: Ctx) {
  const att = await getAttachment((await params).id);
  if (!att) return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });

  const download = new URL(req.url).searchParams.has("download");
  const ascii = att.name.replace(/[^\x20-\x7e]/g, "_");
  const disposition = `${download ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(att.name)}`;

  return new Response(new Blob([new Uint8Array(att.data)]), {
    headers: {
      "content-type": att.mime,
      "content-length": String(att.data.byteLength),
      "content-disposition": disposition,
      "x-content-type-options": "nosniff",
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const denied = checkPin(req);
  if (denied) return denied;
  await deleteAttachment((await params).id);
  return NextResponse.json({ ok: true });
}
