// ==========================================================
//  FÉNIX POS — APP PROPIETARIO
//  Rol: Control del restaurante, empleados, productos, mesas
//  Autor: Joel (Hell)
//  Fecha: 2025-10-15
// ==========================================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import os from "os";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "./config/env.js";
import { assertDb } from "./config/db.js";
import { errorHandler } from "./middlewares/error.middleware.js";


// ===================== RUTAS API =====================

// --- Autenticación ---
import authRoutes from "./modules/auth/auth.routes.js";
// --- Propietario (cuenta principal) ---
import propietarioRoutes from "./modules/propietario/propietario.routes.js";
// --- Restaurantes del propietario ---
import restauranteRoutes from "./modules/propietario/restaurante/restaurante.routes.js";
// --- Categorías de productos ---
import categoriaRoutes from "./modules/propietario/restaurante/categoria_producto/categoria_producto.routes.js";
// --- Productos ---
import productoRoutes from "./modules/propietario/restaurante/producto/producto.routes.js";
// --- Empleados del restaurante ---
import empleadosRoutes from "./modules/propietario/restaurante/empleados/empleados.routes.js";


// ======================================================
//            CONFIGURACIÓN DE APLICACIÓN
// ======================================================

const app = express();
app.use(express.json());

// ----------------------- CORS ------------------------
const cfgOrigins = env.cors?.origins;
const ORIGINS = Array.isArray(cfgOrigins)
  ? cfgOrigins
  : (cfgOrigins ? String(cfgOrigins).split(",").map(s => s.trim()).filter(Boolean) : []);
const ALLOW_ALL = ORIGINS.includes("*");

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // Postman/cURL
    if (ALLOW_ALL) return cb(null, true);
    if (ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: !ALLOW_ALL,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.options(/.*/, cors());
// -----------------------------------------------------

// ======================================================
//         FRONTEND — Servir webapp del propietario
// ======================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const candidates = [
  path.resolve(__dirname, "../../webapp"),
  path.resolve(__dirname, "../webapp"),
  path.resolve(process.cwd(), "apps/webapp"),
  path.resolve(process.cwd(), "webapp"),
];

let WEBAPP_DIR;
for (const p of candidates) {
  if (fs.existsSync(path.join(p, "index.html"))) {
    WEBAPP_DIR = p;
    break;
  }
}

if (WEBAPP_DIR) {
  const INDEX_FILE    = path.join(WEBAPP_DIR, "index.html");
  const PUBLIC_ASSETS = path.join(WEBAPP_DIR, "public");

  console.log(`[Fénix] Sirviendo frontend desde: ${WEBAPP_DIR}`);
  app.use(express.static(WEBAPP_DIR));
  if (fs.existsSync(PUBLIC_ASSETS)) app.use(express.static(PUBLIC_ASSETS));

  app.get("/", (_req, res) => res.sendFile(INDEX_FILE));
  app.get(/^\/(?!api\/).*$/, (req, res, next) => {
    if (path.extname(req.path)) return next();
    res.sendFile(INDEX_FILE);
  });
} else {
  console.warn("[Fénix] No se encontró index.html en webapp");
  console.warn("Rutas probadas:\n" + candidates.map(p => path.join(p, "index.html")).join("\n"));
}

// ======================================================
//                HEALTH & BASE DE DATOS
// ======================================================
app.get("/health", (_req, res) => res.json({ ok: true, role: "propietario" }));
await assertDb();

// ======================================================
//                   RUTAS API
// ======================================================

// --- Pública ---
app.use("/api/auth", authRoutes);

// --- Propietario principal ---
app.use("/api/propietarios", propietarioRoutes);

// --- Submódulos del propietario ---
app.use("/api/propietarios/:propietarioId/restaurantes", restauranteRoutes);

// --- Configuración interna del restaurante ---
app.use("/api/propietarios/:propietarioId/restaurantes/:restauranteId/categorias", categoriaRoutes);
app.use("/api/propietarios/:propietarioId/restaurantes/:restauranteId/productos", productoRoutes);
// --- Empleados ---
app.use( "/api/propietarios/:propietarioId/restaurantes/:restauranteId/empleados",empleadosRoutes);

// --- Manejo de errores y 404 --- 
app.use((_req, res) => res.status(404).json({ message: "Recurso no encontrado" }));
app.use(errorHandler);
// ======================================================
//             CONTROL DE INSTANCIA Y ARRANQUE
// ======================================================
const basePort = Number(env.port_propietario || process.env.PORT || 8081);
const PID_FILE = path.resolve(process.cwd(), ".fenix-propietario.pid");

function banner(msg) {
  const line = "─".repeat(msg.length + 2);
  console.log(`\n┌${line}┐\n│ ${msg} │\n└${line}┘\n`);
}

function anotherInstanceRunning() {
  try {
    if (!fs.existsSync(PID_FILE)) return false;
    const oldPid = Number(fs.readFileSync(PID_FILE, "utf8").trim());
    if (!oldPid) return false;
    process.kill(oldPid, 0);
    return true;
  } catch {
    try { fs.unlinkSync(PID_FILE); } catch {}
    return false;
  }
}

function writePidFile() { try { fs.writeFileSync(PID_FILE, String(process.pid)); } catch {} }
function removePidFile() { try { if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE); } catch {} }
process.on("exit", removePidFile);
process.on("SIGINT", () => { removePidFile(); process.exit(0); });
process.on("SIGTERM", () => { removePidFile(); process.exit(0); });

function isAlreadyUp(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port, path: "/health", timeout: 600 },
      (res) => { res.resume(); resolve(res.statusCode === 200); }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

async function startServer(port, attempts = 0) {
  if (anotherInstanceRunning()) {
    banner(`Fénix Propietario YA está corriendo (pid en ${PID_FILE}).`);
    process.exit(0);
  }
  if (await isAlreadyUp(port)) {
    banner(`Fénix Propietario activo en http://localhost:${port} ✅`);
    console.log(`(Windows) netstat -ano | findstr :${port} → taskkill /PID <PID> /F`);
    process.exit(0);
  }

  const server = app.listen(port, () => {
    writePidFile();
    banner(`Fénix Propietario corriendo en http://localhost:${port} 🚀`);
    if (WEBAPP_DIR) console.log(`Frontend servido desde: ${WEBAPP_DIR}`);
    console.log(`Node ${process.version} • ${os.platform()} ${os.release()}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && attempts < 5) {
      console.warn(`Puerto ${port} ocupado; probando ${port + 1}...`);
      setTimeout(() => startServer(port + 1, attempts + 1), 400);
    } else {
      console.error("No pude iniciar el servidor:", err);
      process.exit(1);
    }
  });
}

startServer(basePort);

export default app;
