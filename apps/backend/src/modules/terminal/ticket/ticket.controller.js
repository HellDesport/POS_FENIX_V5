// apps/backend/src/modules/terminal/ticket/ticket.controller.js
import * as service from "./ticket.service.js";

export async function generar(req, res) {
  try {
    const { restauranteId, ordenId, usuarioId, tipo = "VENTA" } = req.body || {};
    const result = await service.generar(restauranteId, ordenId, usuarioId, tipo);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

export async function reimprimir(req, res) {
  try {
    const { restauranteId, ticketId, usuarioId } = req.body || {};
    await service.reimprimir(restauranteId, ticketId, usuarioId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

export async function reimprimirUltimo(req, res) {
  try {
    const { restauranteId, ordenId, tipo = "VENTA", usuarioId } = req.body || {};
    await service.reimprimirUltimoPorTipo(restauranteId, ordenId, tipo, usuarioId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

export async function listarImpresoras(req, res) {
  try {
    const list = await service.listarImpresoras();
    res.json({ ok: true, ...list });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}
