// apps/backend/src/modules/auth/auth.controller.js
import * as service from "./auth.service.js";

// LOGIN
export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const out = await service.login(email, password); // { ok, token, user }
    res.json(out);
  } catch (err) { next(err); }
}

// ME
export async function me(req, res, next) {
  try {
    const out = await service.me(req.user?.sub);
    res.json(out); // { ok, user }
  } catch (err) { next(err); }
}

// REGISTER PROPIETARIO
export async function registerPropietario(req, res) {
  try {
    // Soporta dos formatos:
    // A) { propietario: { nombre, email }, usuarioLike: { email, password } }
    // B) { nombre, email, password }  (plano)
    let { propietario, usuarioLike, nombre, email, password } = req.body || {};

    if (!propietario && (nombre || email || password)) {
      propietario = { nombre, email };
      usuarioLike = { email, password };
    }

    const out = await service.registerPropietario(propietario, usuarioLike);
    // out debe traer { ok, message?, token, user }
    return res.status(201).json({
      ok: true,
      user: out.user,
      token: out.token,
      message: out.message ?? "Propietario creado correctamente"
    });
  } catch (e) {
    if (e.status)     return res.status(e.status).json({ ok: false, message: e.message });
    if (e.code === "ER_DUP_ENTRY" || e.code === "EMAIL_EXISTS")
      return res.status(409).json({ ok: false, message: "El email ya está registrado." });
    console.error("registerPropietario error:", e);
    return res.status(500).json({ ok: false, message: "Error interno" });
  }
}
