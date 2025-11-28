// public/propietario/auth/auth.js
import {
  apiFetch,
  saveSession,
  redirectByRole,
  setRemember,
  API_BASE
} from "../../assets/js/config.js";

// --- NO autologin aquí. El guard vive en las vistas privadas ---

// ---- Referencias UI ----
const frm         = document.querySelector("#frmLogin");
const msg         = document.querySelector("#msg");
const btn         = document.querySelector("#btnSubmit");
const inputEmail  = document.querySelector("#email");
const inputPass   = document.querySelector("#password");
const btnToggle   = document.querySelector("#btnTogglePwd");
const chkRemember = document.querySelector("#remember"); // opcional

// ---- Mostrar base de API (solo debug, si existe el elemento) ----
const apiBaseEl = document.getElementById("apiBase");
if (apiBaseEl) apiBaseEl.textContent = `API: ${API_BASE}`;

// ---- Mostrar / ocultar contraseña ----
btnToggle?.addEventListener("click", () => {
  const type = inputPass.type === "password" ? "text" : "password";
  inputPass.type = type;
  btnToggle.textContent = type === "password" ? "Mostrar" : "Ocultar";
});

// ---- UX: Enter / Escape en password ----
inputPass.addEventListener("keyup", (e) => {
  if (e.key === "Enter") frm.requestSubmit();
  if (e.key === "Escape") inputPass.blur();
});

// ---- Envío del formulario ----
frm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = inputEmail.value.trim().toLowerCase();
  const password = inputPass.value;

  // Validaciones rápidas
  if (!email || !password) {
    msg.classList.add("error");
    msg.textContent = "Completa ambos campos.";
    return;
  }

  // Estado visual
  btn.disabled = true;
  frm.classList.add("loading");
  msg.classList.remove("error");
  msg.textContent = "Verificando credenciales…";

  try {
    const res = await apiFetch(`/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    // Intenta leer JSON (aunque sea 4xx)
    let data = {};
    try { data = await res.json(); } catch {}

    if (!res || !res.ok) {
      msg.classList.add("error");
      msg.textContent = data?.message || "Email o contraseña incorrectos.";
      inputPass.value = "";
      inputPass.focus();
      return;
    }

    // Esperamos { ok, token, user }
    const { token, user } = data || {};
    if (!token || !user) {
      msg.classList.add("error");
      msg.textContent = "Respuesta inesperada del servidor.";
      console.error("Login response:", data);
      return;
    }

    // Guardar sesión (token + user)
    saveSession({ token, user });

    // ⭐ NUEVO: guardar propietarioId para las vistas del propietario
    const role = user.rol || user.rol_global || "PROPIETARIO";

    if (role === "PROPIETARIO") {
      // Ajusta estas opciones al nombre REAL del campo que te devuelve el backend
      const maybeOwnerId =
        user.propietarioId ??
        user.propietario_id ??
        user.ownerId ??
        user.id; // último recurso

      if (maybeOwnerId != null) {
        localStorage.setItem("fenix_propietarioId", String(maybeOwnerId));
        console.log("[Fénix] propietarioId almacenado:", maybeOwnerId);
      } else {
        console.warn(
          "[Fénix] No se pudo determinar propietarioId desde user:",
          user
        );
      }
    }

    // Preferencia de autologin (si hay checkbox)
    if (chkRemember) setRemember(!!chkRemember.checked);

    // Redirigir según rol
    msg.textContent = "Acceso concedido. Redirigiendo…";
    setTimeout(() => redirectByRole(role), 300);
  } catch (err) {
    msg.classList.add("error");
    msg.textContent = "Error de conexión. Verifica tu red o backend.";
    console.error("Login error:", err);
  } finally {
    btn.disabled = false;
    frm.classList.remove("loading");
  }
});
