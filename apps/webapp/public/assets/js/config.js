// ============================
// FÉNIX — Config & helpers UI
// ============================

// API base (mismo host)
export const API_BASE = `${window.location.origin}/api`;

// Storage keys
const TOKEN_KEY    = "fenix.jwt";
const USER_KEY     = "fenix.user";
const REMEMBER_KEY = "fenix.remember"; // opcional (Recuérdame)

// -----------------------------
// Sesión
// -----------------------------
export function saveSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function getUser()  {
  const raw = localStorage.getItem(USER_KEY);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
export function logout() {
  clearSession();
  location.href = "/index.html";
}

// Recuérdame (opcional)
export function setRemember(v) { localStorage.setItem(REMEMBER_KEY, v ? "true" : "false"); }
export function getRemember()  { return localStorage.getItem(REMEMBER_KEY) === "true"; }

// -----------------------------
// Rutas por rol
// -----------------------------
export function homeByRole(role) {
  switch (role) {
    case "PROPIETARIO": return "/propietario/views/home/dashboard.html"; // nuevo destino
    case "CAJERO":      return "/terminal/views/terminal.index.html";
    case "GERENTE":     return "/gerente/index.html";
    case "MESERO":      return "/mesero/index.html";
    default:            return "/index.html";
  }
}
export function redirectByRole(role) {
  location.href = homeByRole(role);
}

// Login adecuado según contexto actual
export function loginByContext() {
  const p = location.pathname;
  if (p.startsWith("/propietario/")) return "/propietario/auth/login/login.html";
  if (p.startsWith("/terminal/"))    return "/terminal/auth/login.html";
  return "/index.html";
}

// -----------------------------
// Fetch con JWT (JSON o FormData)
// -----------------------------
export async function apiFetch(path, options = {}) {
  const token = getToken();

  // Soporta FormData sin setear Content-Type manual
  const isFormData = options?.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401 || res.status === 403) {
      // sesión inválida o sin permisos → limpiar y enviar a un login coherente
      clearSession();
      location.href = loginByContext();
      return;
    }
    return res;
  } catch (err) {
    console.error("Error de conexión:", err);
    alert("No se pudo conectar con el servidor.");
    throw err;
  }
}

// -----------------------------
// Guards de vistas privadas
// -----------------------------
export function requireAuth(roles = []) {
  const u = getUser();
  if (!u) { location.href = loginByContext(); return null; }
  if (roles.length && !roles.includes(u.rol)) {
    location.href = loginByContext();
    return null;
  }
  return u;
}
