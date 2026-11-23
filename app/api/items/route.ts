import { NextResponse } from "next/server";
import { createItem, listItems } from "@/lib/db";
import { checkPin, cleanInput } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listItems());
}

export async function POST(req: Request) {
  const denied = checkPin(req);
  if (denied) return denied;
  const input = cleanInput(await req.json().catch(() => ({})));
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  return NextResponse.json(await createItem(input), { status: 201 });
}
