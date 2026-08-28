import mysql from "mysql2/promise";

/**
 * Single connection pool, reused across requests/route handlers.
 * `dateStrings: true` keeps DATETIME columns as plain "YYYY-MM-DD
 * HH:MM:SS" strings instead of JS Date objects converted to the
 * server's local timezone — we treat everything as UTC in app code.
 */
let pool: mysql.Pool | undefined;

function getPool(): mysql.Pool {
  if (!pool) {
    const { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } =
      process.env;
    if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) {
      throw new Error(
        "Missing MYSQL_HOST, MYSQL_USER, or MYSQL_DATABASE environment variables"
      );
    }
    pool = mysql.createPool({
      host: MYSQL_HOST,
      port: MYSQL_PORT ? Number(MYSQL_PORT) : 3306,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
    });
  }
  return pool;
}

/** Run a single parameterized query. Always use `?` placeholders — never interpolate values into the SQL string. */
export async function query<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const [rows] = await getPool().query(sql, params);
  return rows as T[];
}

export async function queryOne<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Run several statements atomically on one connection. */
export async function withTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
