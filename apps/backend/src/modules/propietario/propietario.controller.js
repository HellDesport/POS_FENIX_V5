import * as service from "./propietario.service.js";

export async function crearPropietario(req, res, next) {
  try {
    const data = req.body;
    const nuevo = await service.crearPropietario(data);
    res.status(201).json({ message: "Propietario creado correctamente", propietario: nuevo });
  } catch (err) {
    next(err);
  }
}

export async function obtenerPropietarios(req, res, next) {
  try {
    const propietarios = await service.obtenerPropietarios();
    console.log(`[GET propietarios] total: ${propietarios.length}`);
    res.json(propietarios);
  } catch (err) {
    console.error("[Error GET propietarios]", err);
    next(err);
  }
}