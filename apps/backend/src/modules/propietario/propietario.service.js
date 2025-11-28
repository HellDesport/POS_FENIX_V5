import * as repo from "./propietario.repo.js";
import bcrypt from "bcryptjs";



/** Crear propietario (único registro inicial) */
export async function crearPropietario(data) {
  const { razon_social, nombre, email, telefono, password } = data;

  if (!razon_social || !nombre || !email || !password)
    throw new Error("Faltan campos obligatorios");

  const password_hash = await bcrypt.hash(password, 10);

  return await repo.insertarPropietario({
    razon_social,
    nombre,
    email,
    telefono,
    password_hash,
  });
}

/** Obtener todos los propietarios */
export async function obtenerPropietarios() {
  return await repo.obtenerTodos();
}

