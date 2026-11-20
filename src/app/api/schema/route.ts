import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";


export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "No session" }, { status: 401 });
  if (user.role !== "director")
    return NextResponse.json(
      { message: "Catalog inspection is limited to the director." },
      { status: 403 },
    );

  try {
    const db = await getDb();
    const [objects, columns] = await Promise.all([
      db.request().query(`
        SELECT TABLE_SCHEMA AS schemaName, TABLE_NAME AS objectName, TABLE_TYPE AS objectType
        FROM INFORMATION_SCHEMA.TABLES
        ORDER BY TABLE_SCHEMA, TABLE_NAME`),
      db.request().query(`
        SELECT TABLE_SCHEMA AS schemaName, TABLE_NAME AS objectName, COLUMN_NAME AS columnName
        FROM INFORMATION_SCHEMA.COLUMNS
        ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION`),
    ]);

    return NextResponse.json({
      status: "discovered",
      message: `Read ${objects.recordset.length} objects and ${columns.recordset.length} columns from the catalog. No personal records were retrieved.`,
      objects: objects.recordset.map((o: Record<string, unknown>) => ({
        schemaName: String(o.schemaName),
        objectName: String(o.objectName),
        objectType:
          String(o.objectType) === "BASE TABLE" ? "Table" : String(o.objectType),
      })),
      columns: columns.recordset.map((c: Record<string, unknown>) => ({
        schemaName: String(c.schemaName),
        objectName: String(c.objectName),
        columnName: String(c.columnName),
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      status: "unavailable",
      message:
        "Live connection unavailable: " +
        message +
        ". The dashboard needs reachable, read-only database credentials.",
    });
  }
}
