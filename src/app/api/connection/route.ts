import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";


export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "No session" }, { status: 401 });

  const configured = Boolean(
    process.env.DB_HOST &&
      process.env.DB_NAME &&
      process.env.DB_USER &&
      process.env.DB_PASSWORD,
  );
  return NextResponse.json({ configured });
}
