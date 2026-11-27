import { NextResponse } from "next/server";
import { addAttachment, itemExists } from "@/lib/db";
import { checkPin } from "@/lib/api";
import { MAX_BYTES, safeName, sniffMime } from "@/lib/files";

type Ctx = { params: Promise<{ id: string }> };

// Anexa um ingresso (PDF ou imagem) a um item do roteiro.
export async function POST(req: Request, { params }: Ctx) {
  const denied = checkPin(req);
  if (denied) return denied;
  const itemId = Number((await params).id);
  if (!(await itemExists(itemId))) {
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "O arquivo passa de 4 MB" }, { status: 413 });
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(data);
  if (!mime) {
    return NextResponse.json({ error: "Envie um PDF ou uma imagem (JPG, PNG ou WebP)" }, { status: 415 });
  }

  const att = await addAttachment(itemId, { name: safeName(file.name), mime, data });
  return NextResponse.json(att, { status: 201 });
}
