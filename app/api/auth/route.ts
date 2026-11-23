import { NextResponse } from "next/server";

// Diz ao app se precisa de PIN e confere o PIN digitado.
export async function GET() {
  return NextResponse.json({ required: !!process.env.APP_PIN });
}

export async function POST(req: Request) {
  const { pin } = await req.json().catch(() => ({ pin: "" }));
  const ok = !process.env.APP_PIN || pin === process.env.APP_PIN;
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
