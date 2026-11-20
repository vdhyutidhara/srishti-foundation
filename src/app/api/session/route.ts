import { NextResponse } from "next/server";
import { getSession, setSession, isRole, userFor, publicUser } from "@/lib/session";


export async function GET() {
  const user = await getSession();
  return NextResponse.json({ user: user ? publicUser(user) : null });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const role = (body as { role?: unknown }).role;
  if (!isRole(role)) {
    return NextResponse.json(
      { message: "Unknown role. Choose one of the listed personas." },
      { status: 400 },
    );
  }
  await setSession(role);
  return NextResponse.json({ user: publicUser(userFor(role)) });
}
