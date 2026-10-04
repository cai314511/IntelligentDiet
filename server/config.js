import dotenv from "dotenv";
import { randomBytes } from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(serverDir, ".env") });
const userDataDir = path.resolve(
  process.env.USERDATA_DIR || path.join(serverDir, "../userdata"),
);
const configuredDbPath =
  process.env.DB_PATH || path.join(userDataDir, "zhixiang.db");

let localSecret;
if (
  !process.env.JWT_SECRET &&
  (process.env.NODE_ENV || "development") === "development" &&
  configuredDbPath !== ":memory:"
) {
  fs.mkdirSync(userDataDir, { recursive: true });
  const secretPath = path.join(userDataDir, ".jwt-secret");
  if (!fs.existsSync(secretPath))
    fs.writeFileSync(secretPath, randomBytes(32).toString("hex"), {
      mode: 0o600,
      flag: "wx",
    });
  localSecret = fs.readFileSync(secretPath, "utf8").trim();
}
export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  userDataDir,
  dbPath:
    configuredDbPath === ":memory:"
      ? ":memory:"
      : path.resolve(configuredDbPath),
  seedReferenceData: process.env.SEED_REFERENCE_DATA !== "false",
  corsOrigins: (
    process.env.CORS_ORIGIN ||
    "http://localhost:8000,http://127.0.0.1:8000,http://localhost:5500,http://127.0.0.1:5500"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwtSecret:
    process.env.JWT_SECRET || localSecret || randomBytes(32).toString("hex"),
  aiBaseUrl: "https://api.deepseek.com",
  aiApiKey: process.env.DEEPSEEK_API_KEY || "",
  aiModel: "deepseek-v4-flash",
  aiReasoningEffort: "medium",
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS || 30000),
  lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD || 20),
});

if (
  config.nodeEnv === "production" &&
  (!process.env.JWT_SECRET || config.jwtSecret.length < 32)
) {
  throw new Error("生产环境必须配置至少 32 位随机 JWT_SECRET");
}
