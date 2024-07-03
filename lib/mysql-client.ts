import mysql from "mysql2";
import { env } from "./env.ts";

// Create the connection pool. The pool-specific settings are the defaults
export const con = mysql.createPool({
  host: env.JHCIS_DB_SERVER,
  user: env.JHCIS_DB_USER,
  database: env.JHCIS_DB,
  password: env.JHCIS_DB_PASSWORD,
  port: parseInt(env.JHCIS_DB_PORT),
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
  idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});
