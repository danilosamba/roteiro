import { NextResponse } from "next/server";
import { deleteItem, updateItem } from "@/lib/db";
import { checkPin, cleanInput } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const denied = checkPin(req);
  if (denied) return denied;
  const id = Number((await params).id);
  const input = cleanInput(await req.json().catch(() => ({})));
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  const item = await updateItem(id, input);
  return item
    ? NextResponse.json(item)
    : NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const denied = checkPin(req);
  if (denied) return denied;
  await deleteItem(Number((await params).id));
  return NextResponse.json({ ok: true });
}
