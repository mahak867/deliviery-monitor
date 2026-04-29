const fs = require("fs");
const path = require("path");

class FileStateStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  ensureDir() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async init(seedState) {
    this.ensureDir();
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify(seedState, null, 2), "utf8");
    }
  }

  async read() {
    const raw = fs.readFileSync(this.filePath, "utf8");
    return JSON.parse(raw);
  }

  async write(state) {
    this.ensureDir();
    fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2), "utf8");
  }
}

class PostgresStateStore {
  constructor(connectionString, schemaFile) {
    this.connectionString = connectionString;
    this.schemaFile = schemaFile;
    this.pool = null;
  }

  async loadPg() {
    if (this.pool) return;
    const pg = require("pg");
    this.pool = new pg.Pool({
      connectionString: this.connectionString
    });
  }

  async init(seedState) {
    await this.loadPg();
    const schemaFallback = `
      CREATE TABLE IF NOT EXISTS app_state (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    const schemaSql = fs.existsSync(this.schemaFile) ? fs.readFileSync(this.schemaFile, "utf8") : schemaFallback;
    await this.pool.query(schemaSql);
    const existing = await this.pool.query("SELECT payload FROM app_state WHERE id = $1", ["main"]);
    if (!existing.rows.length) {
      await this.pool.query(
        "INSERT INTO app_state (id, payload, updated_at) VALUES ($1, $2::jsonb, NOW())",
        ["main", JSON.stringify(seedState)]
      );
    }
  }

  async read() {
    const result = await this.pool.query("SELECT payload FROM app_state WHERE id = $1", ["main"]);
    if (!result.rows.length) {
      throw new Error("app_state row not found");
    }
    return result.rows[0].payload;
  }

  async write(state) {
    await this.pool.query(
      "UPDATE app_state SET payload = $2::jsonb, updated_at = NOW() WHERE id = $1",
      ["main", JSON.stringify(state)]
    );
  }
}

async function createStateStore(config, seedState) {
  const mode = String(config.PERSISTENCE_MODE || "file").toLowerCase();
  if (mode === "postgres") {
    if (!config.POSTGRES_URL) {
      throw new Error("PERSISTENCE_MODE=postgres requires POSTGRES_URL.");
    }
    const store = new PostgresStateStore(config.POSTGRES_URL, config.DB_SCHEMA_FILE);
    await store.init(seedState);
    return store;
  }
  const store = new FileStateStore(config.DATA_FILE);
  await store.init(seedState);
  return store;
}

module.exports = {
  createStateStore
};
