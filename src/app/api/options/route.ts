import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { projectMeta } from "@/lib/projects";


export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "No session" }, { status: 401 });

  try {
    const db = await getDb();
    const [programs, districts, supports, workers] = await Promise.all([
      db.request().query(
        `SELECT bm.blk_name AS v, COUNT(*) AS c
         FROM serviceuser_mstr sm
         INNER JOIN block_mstr bm ON bm.blk_id = sm.su_block
         GROUP BY bm.blk_name ORDER BY c DESC`,
      ),
      db.request().query(
        `SELECT DISTINCT su_district AS v FROM serviceuser_mstr
         WHERE su_district IS NOT NULL AND su_district <> '' ORDER BY su_district`,
      ),
      db.request().query(
        `SELECT DISTINCT su_disability AS v FROM serviceuser_mstr
         WHERE su_disability IS NOT NULL AND su_disability <> '' ORDER BY su_disability`,
      ),
      db.request().query(
        `SELECT DISTINCT u.usr_name AS v
         FROM serviceuser_mstr sm INNER JOIN User_mstr u ON u.usr_id = sm.su_owner
         WHERE u.usr_name IS NOT NULL AND u.usr_name <> '' ORDER BY u.usr_name`,
      ),
    ]);

    let projects = programs.recordset.map((r: { v: string }, i: number) =>
      projectMeta(r.v, i),
    );
    // Scoped roles only ever see their own programme.
    if (user.program)
      projects = projects.filter(
        (p) => p.name.toLowerCase() === user.program!.toLowerCase(),
      );

    return NextResponse.json({
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        description: p.description,
        icon: p.icon,
      })),
      districts: districts.recordset.map((r: { v: string }) => r.v),
      supports: supports.recordset.map((r: { v: string }) => r.v),
      workers: user.details
        ? workers.recordset.map((r: { v: string }) => r.v)
        : [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message }, { status: 500 });
  }
}
