// public/propietario/auth/register/register.js
import { apiFetch, saveSession, redirectByRole } from "../../../assets/js/config.js";

const frm = document.querySelector("#frmRegister");
const msg = document.querySelector("#msg");
const btn = document.querySelector("#btnSubmit");

frm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nombre    = frm.nombre.value.trim();
  const email     = frm.email.value.trim();
  const password  = frm.password.value;
  const password2 = frm.password2.value;

  if (!nombre || !email || !password) return showError("Completa todos los campos.");
  if (password !== password2)         return showError("Las contraseñas no coinciden.");

  setLoading(true, "Creando cuenta…");
  try {
    const res  = await apiFetch(`/auth/register-propietario`, {
      method: "POST",
      body: JSON.stringify({ propietario: { nombre, email }, usuarioLike: { email, password } }),
      noAuthRedirect: true,
    });
    const data = res ? await res.json() : null;

    if (!res?.ok) return showError(data?.message || "No se pudo crear la cuenta.");
    if (!data?.token || !data?.user) return showError("Respuesta inesperada del servidor.");

    saveSession({ token: data.token, user: data.user });
    msg.textContent = "Cuenta creada. Redirigiendo…";
    setTimeout(() => redirectByRole(data.user.rol), 500);
  } catch (err) {
    showError("Error de conexión.");
    console.error(err);
  } finally { setLoading(false); }
});

function showError(text) { msg.classList.add("error"); msg.textContent = text; }
function setLoading(on, text="") { btn.disabled = on; frm.classList.toggle("loading", on); msg.classList.remove("error"); msg.textContent = text; }
