import * as service from "./auth.service.js";

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const data = await service.login(email, password);
    res.json({ ok: true, message: "Inicio de sesión correcto", ...data });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  res.json({ ok: true, user: req.user });
}

export async function logout(req, res) {
  // Los tokens JWT son stateless; solo invalidamos en el cliente
  res.json({ ok: true, message: "Sesión finalizada" });
}
