import { Pool, types, type QueryResultRow } from "pg";

// "date" volta como texto AAAA-MM-DD; bigint como número.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(20, (v) => Number(v));

declare global {
  // eslint-disable-next-line no-var
  var __winnerPool: Pool | undefined;
}

function makePool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida");
  const local = /localhost|127\.0\.0\.1|\.railway\.internal/.test(url);
  return new Pool({ connectionString: url, max: 10, ssl: local ? undefined : { rejectUnauthorized: false } });
}

export function pool(): Pool {
  if (!globalThis.__winnerPool) globalThis.__winnerPool = makePool();
  return globalThis.__winnerPool;
}

export async function q<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool().query<T>(text, params);
  return res.rows;
}

export async function one<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}
