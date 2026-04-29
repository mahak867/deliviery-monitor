const fs = require("fs");
const path = require("path");

function parseBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function parseNumber(value, defaultValue) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return defaultValue;
  return parsed;
}

function loadDotEnv(rootDir) {
  const envFile = path.join(rootDir, ".env");
  if (!fs.existsSync(envFile)) return;
  const lines = fs.readFileSync(envFile, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsAt = trimmed.indexOf("=");
    if (equalsAt <= 0) continue;
    const key = trimmed.slice(0, equalsAt).trim();
    let value = trimmed.slice(equalsAt + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function configFromEnv(baseDir) {
  const rootDir = baseDir || process.cwd();
  loadDotEnv(rootDir);
  return {
    PORT: parseNumber(process.env.PORT, 3000),
    PUBLIC_DIR: path.join(rootDir, "public"),
    DATA_FILE: path.join(rootDir, "data", "store.json"),
    DB_SCHEMA_FILE: path.join(rootDir, "database", "schema.sql"),
    PERSISTENCE_MODE: process.env.PERSISTENCE_MODE || "file",
    POSTGRES_URL: process.env.POSTGRES_URL || "",
    ENFORCE_AUTH: parseBool(process.env.ENFORCE_AUTH, false),
    JWT_SECRET: process.env.APP_JWT_SECRET || "swiftseva-dev-secret-change-me",
    OTP_TTL_SECONDS: parseNumber(process.env.OTP_TTL_SECONDS, 300),
    OTP_MAX_ATTEMPTS: parseNumber(process.env.OTP_MAX_ATTEMPTS, 5),
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "",
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || "",
    PHONEPE_MERCHANT_ID: process.env.PHONEPE_MERCHANT_ID || "",
    PHONEPE_SALT_KEY: process.env.PHONEPE_SALT_KEY || "",
    PHONEPE_SALT_INDEX: process.env.PHONEPE_SALT_INDEX || "",
    PAYTM_MID: process.env.PAYTM_MID || "",
    PAYTM_MERCHANT_KEY: process.env.PAYTM_MERCHANT_KEY || "",
    MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY || "",
    MSG91_TEMPLATE_ID: process.env.MSG91_TEMPLATE_ID || "",
    MSG91_SENDER: process.env.MSG91_SENDER || "SWSEVA"
  };
}

module.exports = {
  configFromEnv,
  parseBool
};
