// =====================================================
// api.js — API del módulo Menú (VERSIÓN NUEVA COMPATIBLE)
// =====================================================

import { apiFetch, requireAuth } from "/assets/js/config.js";


// =====================================================
// Obtener usuario autenticado (versión correcta)
// — requireAuth valida token, rol y devuelve el usuario
// =====================================================
export function getCurrentUser() {
  return requireAuth(["PROPIETARIO"]) || null;
}


// =====================================================
// Construir API_BASE
//  (NO lleva /api al inicio porque apiFetch ya lo añade)
// =====================================================
export function getApiBase(propietarioId) {
  return `/propietarios/${propietarioId}/restaurantes`;
}



// =====================================================
// RESTAURANTE
// =====================================================
export async function getRestaurante() {
  const user = getCurrentUser();
  if (!user) return null;

  const propietarioId = user.propietario_id ?? user.id;
  const API_BASE = getApiBase(propietarioId);

  const res = await apiFetch(API_BASE, { method: "GET" });
  if (!res?.ok) return null;

  const data = await res.json();

  if (Array.isArray(data) && data.length) return data[0];
  if (data?.data?.length) return data.data[0];
  if (data?.restaurante) return data.restaurante;

  return data ?? null;
}



// =====================================================
// CATEGORÍAS
// =====================================================
export async function getCategorias(restauranteId) {
  const user = getCurrentUser();
  if (!user) return { data: [] };

  const propietarioId = user.propietario_id ?? user.id;
  const API_BASE = getApiBase(propietarioId);

  const res = await apiFetch(
    `${API_BASE}/${restauranteId}/categorias?incluyeInactivas=1`
  );

  if (!res?.ok) return { data: [] };
  return await res.json();
}



// =====================================================
// PRODUCTOS
// =====================================================
export async function getProductos(restauranteId) {
  const user = getCurrentUser();
  if (!user) return { data: [] };

  const propietarioId = user.propietario_id ?? user.id;
  const API_BASE = getApiBase(propietarioId);

  const res = await apiFetch(`${API_BASE}/${restauranteId}/productos`);
  if (!res?.ok) return { data: [] };

  return await res.json();
}



// =====================================================
// CREAR / EDITAR / ELIMINAR CATEGORÍA
// =====================================================
export async function saveCategoria(API_BASE, restauranteId, data, categoriaId) {
  const isEdit = !!categoriaId;

  const url = isEdit
    ? `${API_BASE}/${restauranteId}/categorias/${categoriaId}`
    : `${API_BASE}/${restauranteId}/categorias`;

  const method = isEdit ? "PUT" : "POST";

  const res = await apiFetch(url, {
    method,
    body: JSON.stringify(data),
  });

  if (!res?.ok) {
    const info = await res.json().catch(() => null);
    throw new Error(info?.message || "Error al guardar categoría");
  }

  return await res.json();
}


export async function deleteCategoria(API_BASE, restauranteId, categoriaId) {
  const url = `${API_BASE}/${restauranteId}/categorias/${categoriaId}`;
  const res = await apiFetch(url, { method: "DELETE" });

  if (!res?.ok) throw new Error("Error eliminando categoría");
  return true;
}



// =====================================================
// SUBCATEGORÍA
// =====================================================
export async function saveSubcategoria(API_BASE, restauranteId, data, subcatId) {
  const isEdit = !!subcatId;

  const url = isEdit
    ? `${API_BASE}/${restauranteId}/categorias/${subcatId}`
    : `${API_BASE}/${restauranteId}/categorias`;

  const method = isEdit ? "PUT" : "POST";

  const res = await apiFetch(url, {
    method,
    body: JSON.stringify(data),
  });

  if (!res?.ok) {
    const info = await res.json().catch(() => null);
    throw new Error(info?.message || "Error guardando subcategoría");
  }

  return await res.json();
}


export async function deleteSubcategoria(API_BASE, restauranteId, subcatId) {
  const url = `${API_BASE}/${restauranteId}/categorias/${subcatId}`;
  const res = await apiFetch(url, { method: "DELETE" });

  if (!res?.ok) throw new Error("Error eliminando subcategoría");
  return true;
}



// =====================================================
// PRODUCTO
// =====================================================
export async function saveProducto(API_BASE, restauranteId, data, productoId) {
  const isEdit = !!productoId;

  const url = isEdit
    ? `${API_BASE}/${restauranteId}/productos/${productoId}`
    : `${API_BASE}/${restauranteId}/productos`;

  const method = isEdit ? "PUT" : "POST";

  const res = await apiFetch(url, {
    method,
    body: JSON.stringify(data),
  });

  if (!res?.ok) {
    let info = null;
    try { info = await res.json(); } catch (_) {}
    throw new Error(info?.message || "Error guardando producto");
  }

  return await res.json();
}



export async function deleteProducto(API_BASE, restauranteId, productoId) {
  const url = `${API_BASE}/${restauranteId}/productos/${productoId}`;
  const res = await apiFetch(url, { method: "DELETE" });

  if (!res?.ok) throw new Error("Error eliminando producto");
  return true;
}



// =====================================================
// MESAS
// =====================================================
export async function saveMesas(API_BASE, restauranteId, totalMesas) {
  const url = `${API_BASE}/${restauranteId}`;
  const res = await apiFetch(url, {
    method: "PUT",
    body: JSON.stringify({ total_mesas: totalMesas }),
  });

  if (!res?.ok) throw new Error("Error guardando mesas");
  return await res.json();
}
