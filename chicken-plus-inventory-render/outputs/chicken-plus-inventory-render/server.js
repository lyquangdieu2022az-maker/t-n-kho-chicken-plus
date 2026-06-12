const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 4173;
const publicDir = path.join(__dirname, "outputs");
const dataDir = path.join(__dirname, "data");
const localStatePath = path.join(dataDir, "state.json");
const stateTable = "chicken_plus_inventory_state";
const stateKey = "inventory";

const sampleItems = [
  { id: "m-ga", name: "Mè gà", sku: "M", category: "Gà", qty: 9, min: 5, price: 0, location: "Tủ gà" },
  { id: "dui-ga", name: "Đùi gà", sku: "D", category: "Gà", qty: 34, min: 5, price: 0, location: "Tủ gà" },
  { id: "khong-xuong", name: "Không xương", sku: "KX", category: "Gà", qty: 9, min: 5, price: 0, location: "Tủ gà" },
  { id: "nua-con", name: "Nửa con", sku: "1/5", category: "Gà", qty: 11, min: 5, price: 0, location: "Tủ gà" },
  { id: "canh-ga", name: "Cánh gà", sku: "C", category: "Gà", qty: 68, min: 5, price: 0, location: "Tủ gà" },
  { id: "sot-chicken-plus", name: "Sốt Chicken Plus", sku: "SOT", category: "Sốt", qty: 12, min: 4, price: 0, location: "Kệ sốt" }
];

const sampleState = {
  items: sampleItems,
  audit: [
    {
      title: "Khởi tạo dữ liệu mẫu",
      detail: "6 mặt hàng đã sẵn sàng để kiểm tồn.",
      at: new Date().toISOString()
    }
  ]
};

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false }
    })
  : null;

let dbReady = false;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    storage: pool ? "postgres" : "local-json"
  });
});

app.get("/api/state", async (_req, res, next) => {
  try {
    const state = await readState();
    res.json(state);
  } catch (error) {
    next(error);
  }
});

app.put("/api/state", async (req, res, next) => {
  try {
    const state = normalizeState(req.body);
    await writeState(state);
    res.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "inventory-web.html"));
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(publicDir, "inventory-web.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ ok: false, error: "Server không xử lý được yêu cầu." });
});

app.listen(port, () => {
  console.log(`Chicken Plus inventory running on port ${port}`);
});

async function readState() {
  if (pool) {
    await ensureDatabase();
    const result = await pool.query(`select value, updated_at from ${stateTable} where key = $1`, [stateKey]);
    if (!result.rowCount) return { ...sampleState, isSeed: true, updatedAt: null };
    return {
      ...normalizeState(result.rows[0].value),
      isSeed: false,
      updatedAt: result.rows[0].updated_at
    };
  }

  try {
    const raw = await fs.readFile(localStatePath, "utf8");
    return { ...normalizeState(JSON.parse(raw)), isSeed: false };
  } catch {
    return { ...sampleState, isSeed: true, updatedAt: null };
  }
}

async function writeState(state) {
  if (pool) {
    await ensureDatabase();
    await pool.query(
      `insert into ${stateTable} (key, value, updated_at)
       values ($1, $2, now())
       on conflict (key)
       do update set value = excluded.value, updated_at = now()`,
      [stateKey, state]
    );
    return;
  }

  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(localStatePath, JSON.stringify(state, null, 2), "utf8");
}

async function ensureDatabase() {
  if (dbReady) return;
  await pool.query(`
    create table if not exists ${stateTable} (
      key text primary key,
      value jsonb not null,
      updated_at timestamptz not null default now()
    )
  `);
  dbReady = true;
}

function normalizeState(value) {
  const items = Array.isArray(value && value.items) ? value.items : [];
  const audit = Array.isArray(value && value.audit) ? value.audit : [];
  return {
    items: items.map(normalizeItem),
    audit: audit.slice(0, 30).map(normalizeAuditEntry)
  };
}

function normalizeItem(item) {
  return {
    id: String(item.id || makeId()),
    name: String(item.name || "").trim(),
    sku: String(item.sku || "").trim(),
    category: String(item.category || "").trim(),
    qty: Math.max(0, Number(item.qty) || 0),
    min: Math.max(0, Number(item.min) || 0),
    price: Math.max(0, Number(item.price) || 0),
    location: String(item.location || "").trim()
  };
}

function normalizeAuditEntry(entry) {
  return {
    title: String(entry.title || "Cập nhật"),
    detail: String(entry.detail || ""),
    at: entry.at || new Date().toISOString()
  };
}

function makeId() {
  return "item-" + Date.now().toString(36) + Math.random().toString(36).slice(2);
}
