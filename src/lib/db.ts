import sql from "mssql";

const requiredEnvVars = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"] as const;

function getRequiredEnv(name: (typeof requiredEnvVars)[number]): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getConfig(): sql.config {
  const rawPort = process.env.DB_PORT ?? "1433";
  const port = Number.parseInt(rawPort, 10);
  const connectionTimeout = Number.parseInt(process.env.DB_CONNECTION_TIMEOUT_MS ?? "30000", 10);
  const requestTimeout = Number.parseInt(process.env.DB_REQUEST_TIMEOUT_MS ?? "30000", 10);

  if (Number.isNaN(port)) {
    throw new Error("Invalid DB_PORT. Expected a numeric port value.");
  }

  if (Number.isNaN(connectionTimeout) || Number.isNaN(requestTimeout)) {
    throw new Error("Invalid DB timeout env vars. Expected numeric millisecond values.");
  }

  return {
    server: getRequiredEnv("DB_HOST"),
    port,
    database: getRequiredEnv("DB_NAME"),
    user: getRequiredEnv("DB_USER"),
    password: getRequiredEnv("DB_PASSWORD"),
    options: {
      // Default to encrypted connections in cloud environments unless explicitly disabled.
      encrypt: process.env.DB_ENCRYPT !== "false",
      trustServerCertificate: true, // required for AWS RDS SQL Server (uses AWS internal CA)
    },
    connectionTimeout,
    requestTimeout,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

// Module-level pool singleton — reused across serverless invocations
let pool: sql.ConnectionPool | null = null;

export async function getDb(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) return pool;

  pool = new sql.ConnectionPool(getConfig());
  try {
    await pool.connect();
  } catch (err) {
    pool = null; // reset so next request retries fresh
    throw err;
  }
  return pool;
}

export { sql };
