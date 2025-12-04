import {
  apiFetch,
  saveSession,
  redirectByRole,
  getUser,
  API_BASE
} from "../../assets/js/config.js";

// Si ya hay sesión, redirige según rol (evita que la terminal tenga que reloguear)
const u = getUser();
if (u?.rol) redirectByRole(u.rol);

// ---- Referencias UI ----
const frm        = document.querySelector("#frmLogin");
const msg        = document.querySelector("#msg");
const btn        = document.querySelector("#btnSubmit");
const inputEmail = document.querySelector("#email");
const inputPass  = document.querySelector("#password");
const btnToggle  = document.querySelector("#btnTogglePwd");

// Mostrar base de API si hay elemento de debug
const apiBaseEl = document.getElementById("apiBase");
if (apiBaseEl) apiBaseEl.textContent = `API: ${API_BASE}`;

// Mostrar / ocultar contraseña
btnToggle.addEventListener("click", () => {
  const type = inputPass.type === "password" ? "text" : "password";
  inputPass.type = type;
  btnToggle.textContent = type === "password" ? "Mostrar" : "Ocultar";
});

// UX: Enter para enviar, Escape para salir del campo
inputPass.addEventListener("keyup", (e) => {
  if (e.key === "Enter") frm.requestSubmit();
  if (e.key === "Escape") inputPass.blur();
});

// Envío del formulario
frm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = inputEmail.value.trim();
  const password = inputPass.value;

  if (!email || !password) {
    msg.classList.add("error");
    msg.textContent = "Completa ambos campos.";
    return;
  }

  btn.disabled = true;
  frm.classList.add("loading");
  msg.classList.remove("error");
  msg.textContent = "Verificando credenciales…";

  try {
    // Ajusta este endpoint si el backend de terminal usa otro path:
    // ej: `/terminal/auth/login` o `/api/terminal/auth/login`
    const res = await apiFetch(`/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    let data = {};
    try { data = await res.json(); } catch {}

    if (!res.ok) {
      msg.classList.add("error");
      msg.textContent = data?.message || "Usuario o contraseña incorrectos.";
      inputPass.value = "";
      inputPass.focus();
      return;
    }

    if (!data?.token || !data?.user) {
      msg.classList.add("error");
      msg.textContent = "Respuesta inesperada del servidor.";
      console.error("Login response (terminal):", data);
      return;
    }

    // Guarda sesión global (mismo mecanismo que propietario)
    saveSession({ token: data.token, user: data.user });

    msg.textContent = "Acceso concedido. Redirigiendo…";

    // Si el rol viene como 'TERMINAL', redirectByRole ya debe mandarte al panel de la terminal
    setTimeout(() => redirectByRole(data.user.rol), 400);
  } catch (err) {
    msg.classList.add("error");
    msg.textContent = "Error de conexión. Verifica la red o el backend de terminal.";
    console.error("Login error (terminal):", err);
  } finally {
    btn.disabled = false;
    frm.classList.remove("loading");
  }
});
