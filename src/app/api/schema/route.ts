import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();

    const [divisions, programs, atpDivisions, atpYears] = await Promise.all([
      db.request().query(`SELECT DISTINCT su_division, COUNT(*) AS cnt FROM serviceuser_mstr GROUP BY su_division ORDER BY cnt DESC`),
      db.request().query(`SELECT DISTINCT su_program, COUNT(*) AS cnt FROM serviceuser_mstr GROUP BY su_program ORDER BY cnt DESC`),
      db.request().query(`SELECT DISTINCT atp_division, COUNT(*) AS cnt FROM atp_mstr GROUP BY atp_division ORDER BY cnt DESC`),
      db.request().query(`SELECT DISTINCT atp_year, COUNT(*) AS cnt FROM atp_mstr GROUP BY atp_year ORDER BY atp_year DESC`),
    ]);

    return NextResponse.json({
      su_division_values: divisions.recordset,
      su_program_values: programs.recordset,
      atp_division_values: atpDivisions.recordset,
      atp_year_values: atpYears.recordset,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
