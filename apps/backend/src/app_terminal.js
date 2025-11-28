// ============================================================
// PROYECTO FÉNIX — APP TERMINAL POS
// Autor: Joel (Hell)
// Fase: 4.0 — Rol Terminal con gestión automática del servicio Printer
// ============================================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { env } from "./config/env.js";
import { assertDb } from "./config/db.js";
import { errorHandler } from "./middlewares/error.middleware.js";

// === Directorios base robustos (independiente del cwd) ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);          // .../apps/backend/src
const BASE_DIR = path.resolve(__dirname, "..");      // .../apps/backend

// === RUTAS DEL ROL TERMINAL ===
import terminalAuthRoutes from "./modules/terminal/auth/auth.routes.js";
import terminalRoutes from "./modules/terminal/terminal.routes.js";
import printerRoutes from "./printer/printer.routes.js";

const app = express();
app.use(express.json());

// ============================================================
// CONFIGURACIÓN DE CORS
// ============================================================
const cfgOrigins = env.cors?.origins;
const ORIGINS = Array.isArray(cfgOrigins)
  ? cfgOrigins
  : cfgOrigins
  ? String(cfgOrigins).split(",").map((s) => s.trim()).filter(Boolean)
  : [];
const ALLOW_ALL = ORIGINS.includes("*");

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ALLOW_ALL) return cb(null, true);
      if (ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: !ALLOW_ALL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options(/.*/, cors());

// ============================================================
// HEALTH CHECK + CONEXIÓN BD
// ============================================================
app.get("/health", (_req, res) =>
  res.json({ ok: true, role: "terminal", status: "online" })
);
await assertDb();

// ============================================================
// RUTAS DEL ROL TERMINAL
// ============================================================
app.use("/api/terminal/auth", terminalAuthRoutes);
app.use("/api/terminal", terminalRoutes);
app.use("/api/printer", printerRoutes);

// ============================================================
// MANEJO DE ERRORES Y 404
// ============================================================
app.use("/api", (_req, res) =>
  res.status(404).json({ ok: false, message: "Recurso no encontrado" })
);
app.use(errorHandler);

// ============================================================
// PID CONTROL
// ============================================================
const basePort = Number(env.port_terminal || 8082);
const PID_FILE = path.resolve(BASE_DIR, ".fenix-terminal.pid");

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

function writePidFile() {
  try { fs.writeFileSync(PID_FILE, String(process.pid)); } catch {}
}

function removePidFile() {
  try { if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE); } catch {}
}

// ============================================================
// AUTOARRANQUE DEL SERVICIO DE IMPRESIÓN
// ============================================================
let printerProc = null;

function findDotnetPath() {
  const possible = [
    "C:\\Program Files\\dotnet\\dotnet.exe",
    "C:\\Program Files (x86)\\dotnet\\dotnet.exe",
    path.join(process.env.LOCALAPPDATA || "", "Microsoft\\dotnet\\dotnet.exe"),
    process.env.DOTNET_PATH, // opcional por .env
  ].filter(Boolean);
  const found = possible.find(p => fs.existsSync(p));
  return found || "dotnet"; // último intento: del PATH
}

function resolvePrinterServicePath() {
  const candidates = [
    process.env.PRINTER_SERVICE_PATH
      ? path.resolve(BASE_DIR, process.env.PRINTER_SERVICE_PATH)
      : null,
    path.resolve(BASE_DIR, "../print-service/Fenix.PrintService"), // ✅ ruta real
  ].filter(Boolean);

  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.existsSync(path.join(p, "Fenix.PrintService.csproj"))) {
        return p;
      }
    } catch {}
  }
  return null;
}

async function ensurePrinterService() {
  const url = process.env.PRINTER_SERVICE_URL || "http://localhost:9100";

  // ¿ya está arriba?
  try {
    const res = await fetch(`${url}/status`);
    if (res.ok) {
      console.log("🖨️ Printer Service ya está en ejecución ✅");
      return;
    }
  } catch {
    console.log("⚠️ Printer Service no responde. Intentando iniciar...");
  }

  // Resolver rutas
  const servicePath = resolvePrinterServicePath();
  if (!servicePath) {
    console.error("❌ No pude ubicar 'printer-service'. Define PRINTER_SERVICE_PATH o revisa la estructura.");
    return;
  }

  const dotnet = findDotnetPath();
  if (dotnet !== "dotnet") console.log(`ℹ️ dotnet detectado en: ${dotnet}`);
  console.log(`ℹ️ CWD del printer-service: ${servicePath}`);

  try {
    // Sin shell, con cwd válido. Evita ENOENT por rutas con espacios y cwd inexistente.
    printerProc = spawn(dotnet, ["run"], {
      cwd: servicePath,
      stdio: "inherit",
      windowsHide: false,
    });

    printerProc.on("error", (err) => {
      console.error("❌ Error al lanzar Printer Service:", err.message);
    });

    printerProc.on("exit", (code) => {
      console.log(`⚠️ Printer Service finalizó con código ${code}`);
    });

    console.log("🟢 Printer Service iniciado desde Terminal POS.");
  } catch (err) {
    console.error("❌ No se pudo iniciar Printer Service:", err.message);
  }
}

function stopPrinterService() {
  if (printerProc && !printerProc.killed) {
    try {
      console.log("🧩 Cerrando Printer Service...");
      printerProc.kill("SIGINT");
    } catch (err) {
      console.warn("⚠️ No se pudo detener Printer Service:", err.message);
    }
  }
}

// Vincular eventos de salida para cierre limpio
process.on("exit", () => {
  removePidFile();
  stopPrinterService();
});
process.on("SIGINT", () => {
  removePidFile();
  stopPrinterService();
  process.exit(0);
});
process.on("SIGTERM", () => {
  removePidFile();
  stopPrinterService();
  process.exit(0);
});

// ============================================================
// ARRANQUE COMPLETO DEL TERMINAL POS
// ============================================================
async function isAlreadyUp(port) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: "127.0.0.1", port, path: "/health", timeout: 600 },
      (res) => { res.resume(); resolve(res.statusCode === 200); }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

async function startServer(port, attempts = 0) {
  if (anotherInstanceRunning()) {
    banner(`Terminal POS YA está corriendo (pid en ${PID_FILE}). Evitando duplicado.`);
    process.exit(0);
  }

  if (await isAlreadyUp(port)) {
    banner(`Terminal POS ya activo en http://localhost:${port} ✅`);
    console.log(`(Windows) netstat -ano | findstr :${port} → taskkill /PID <PID> /F`);
    process.exit(0);
  }

  // Aseguramos que el microservicio de impresión esté activo
  await ensurePrinterService();

  const server = app.listen(port, () => {
    writePidFile();
    banner(`Terminal POS corriendo en http://localhost:${port} 🚀`);
    console.log(`Node ${process.version} • ${os.platform()} ${os.release()}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && attempts < 5) {
      console.warn(`Puerto ${port} ocupado; probando ${port + 1}...`);
      setTimeout(() => startServer(port + 1, attempts + 1), 400);
    } else {
      console.error("No pude iniciar el servidor Terminal:", err);
      process.exit(1);
    }
  });
}

await startServer(basePort);
export default app;
