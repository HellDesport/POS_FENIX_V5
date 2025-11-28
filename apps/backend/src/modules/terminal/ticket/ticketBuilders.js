// apps/backend/src/modules/terminal/ticket/ticketBuilders.js

function money(n) { return (Number(n) || 0).toFixed(2); }
function nowISO() { return new Date().toISOString(); }

/* =========================================================
   COMANDA – Cocina (JSON para microservicio)
   ========================================================= */
export function buildKitchenPayload({ ticket, data, impresora }) {
  const { orden, detalle } = data || {};
  return {
    type: "KITCHEN_80MM",
    printer: impresora,
    meta: { ticket_id: ticket.id || null, orden_id: orden?.id || null, generado_en: nowISO() },
    header: {
      titulo: "COMANDA",
      restaurante: orden?.restaurante_nombre || "RESTAURANTE",
      mesa: orden?.mesa_nombre || "-",
      orden_tipo: orden?.orden_tipo || "-",
    },
    items: (detalle || []).map(d => ({
      name: d.producto_nombre,
      qty: d.cantidad,
      notes: d.nota || d.notas || null
    })),
    footer: { qr: ticket.contenido_qr || null }
  };
}

/* =========================================================
   VENTA — Ticket en TEXTO (80/58mm), sin ESC/POS
   ========================================================= */
export function buildSalePayload({ ticket, data, impresora }) {
  const { orden, detalle, cfg } = data || {};

  // -------- ancho papel --------
  const PAPER = String(cfg?.paper || "80");
  const COLS  = PAPER === "58" ? 32 : 42;

  // -------- helpers --------
  const out = [];
  const LINE = "-".repeat(COLS);
  const pad = (s, w) => (s || "").toString().padEnd(w).slice(0, w);
  const center = (s) => {
    const t = (s || "").toString();
    const left = Math.max(0, Math.floor((COLS - t.length) / 2));
    return " ".repeat(left) + t;
  };
  const dotted = (label, value) => {
    const L = (label + ":");
    const v = typeof value === "number" ? money(value) : String(value ?? "");
    const dots = ".".repeat(Math.max(1, COLS - (L.length + v.length)));
    return `${L}${dots}${v}`;
  };

  const leftWidth = COLS - (10 + 6); // nombre | "2x 18.00" | " 36.00"
  const wrap = (s, w = leftWidth) => {
    const t = (s ?? "").toString();
    if (t.length <= w) return [t];
    const out = [];
    for (let i = 0; i < t.length; i += w) out.push(t.slice(i, i + w));
    return out;
  };
  const buildItem = (name, qty, price, amount, notes) => {
    const lines = [];
    const parts = wrap(name);
    const nm  = pad(parts[0], leftWidth);
    const mid = `${qty}x ${money(price)}`.padStart(10);
    const amt = money(amount).padStart(6);
    lines.push(nm + mid + amt);
    for (let i = 1; i < parts.length; i++) lines.push(pad(parts[i], leftWidth));
    const ns = (notes ?? "").toString().trim();
    if (ns) for (const l of wrap(`↳ ${ns}`, COLS - 2)) lines.push("  " + l);
    return lines;
  };

  // ======= Datos restaurante/usuario (fallback cfg -> data) =======
  const Rcfg = cfg?.restInfo || null;
  const Ucfg = cfg?.userInfo || null;
  const Rraw = data?.restaurante || null;
  const Uraw = data?.usuario || null;

  const R = Rcfg ? Rcfg : (Rraw ? {
    nombre: Rraw.nombre || null,
    rfc: Rraw.rfc || null,
    telefono: Rraw.telefono || null,
    dir: {
      calle: Rraw.calle || null,
      numExt: Rraw.numero_ext || null,
      numInt: Rraw.numero_int || null,
      colonia: Rraw.colonia || null,
      municipio: Rraw.municipio || null,
      estado: Rraw.estado || null,
      cp: Rraw.codigo_postal || null
    }
  } : null);

  const U = Ucfg ? Ucfg : (Uraw ? {
    nombre: Uraw.nombre || null,
    email: Uraw.email || null,
    rol: Uraw.rol_local || null
  } : null);

  const brand = (R?.nombre) || orden?.restaurante_nombre || "RESTAURANTE";
  const dir1 = R?.dir ? [R.dir.calle, R.dir.numExt && `#${R.dir.numExt}`, R.dir.numInt && `Int ${R.dir.numInt}`]
    .filter(Boolean).join(" ") : "";
  const dir2 = R?.dir ? [R.dir.colonia, R.dir.municipio, R.dir.estado, R.dir.cp && `CP ${R.dir.cp}`]
    .filter(Boolean).join(", ") : "";
  const rfcTel = [R?.rfc && `RFC ${R.rfc}`, R?.telefono && `Tel. ${R.telefono}`].filter(Boolean).join("  ");

  // -------- encabezado --------
  out.push(center(brand));
  out.push(center("Ticket de venta"));
  out.push(LINE);
  if (rfcTel) out.push(center(rfcTel));
  if (dir1)   out.push(center(dir1));
  if (dir2)   out.push(center(dir2));
  if (rfcTel || dir1 || dir2) out.push(LINE);

  const cajero = [U?.nombre, U?.rol && `(${U.rol})`].filter(Boolean).join(" ");
  if (cajero) out.push(`ATENDIÓ: ${cajero}`);
  out.push(`MESA: ${orden?.mesa_nombre || "-"}`);
  out.push(`TIPO: ${orden?.orden_tipo || "-"}`);
  const f = new Date(orden?.abierta_en || Date.now());
  out.push(`FECHA: ${f.toLocaleDateString()} ${f.toLocaleTimeString()}`);
  if (orden?.serie_folio || orden?.folio) {
    const folio = `${orden.serie_folio || ""}${orden.folio || ""}`.trim();
    if (folio) out.push(`FOLIO: ${folio}`);
  }
  out.push(LINE);

  // -------- detalle --------
  for (const d of (detalle || [])) {
    const q = Number(d.cantidad || 0);
    const p = Number(d.precio_unitario || 0);
    const imp = Number(d.importe || (q * p));
    const notes = d.nota || d.notas || d.notes || "";
    out.push(...buildItem(d.producto_nombre, q, p, imp, notes));
  }
  out.push(LINE);

  // -------- totales --------
  const tasa = Number(orden?.iva_tasa_en_venta ?? cfg?.impuesto_tasa ?? 16);
  const modo = String(orden?.iva_modo_en_venta ?? cfg?.impuesto_modo ?? "INCLUIDO").toUpperCase();

  let sub = Number(orden?.subtotal ?? 0);
  let iva = Number(orden?.iva ?? 0);
  let total = Number(orden?.total ?? 0);

  if (!total) {
    sub = (detalle || []).reduce((a, d) => a + Number(d.precio_unitario || 0) * Number(d.cantidad || 0), 0);
    if (modo === "DESGLOSADO") {
      iva = +(sub * (tasa / 100)).toFixed(2);
      total = sub + iva;
    } else if (modo === "INCLUIDO") {
      iva = +((sub * tasa) / (100 + tasa)).toFixed(2);
      total = sub;               // sub ya incluye IVA
      sub = +(total - iva).toFixed(2);
    } else { // EXENTO
      iva = 0;
      total = sub;
    }
  }

  const showRound = Number(orden?.ajuste_redondeo || 0) !== 0;
  const showIva   = (modo === "DESGLOSADO") || Number(cfg?.mostrar_desglose_iva_en_ticket || 0) === 1;

  out.push(dotted("SUBTOTAL", sub));
  if (showIva) out.push(dotted(`IVA ${tasa}%`, iva));
  if (showRound) out.push(dotted("AJUSTE", Number(orden.ajuste_redondeo || 0)));
  out.push(dotted("TOTAL", total));
  out.push(LINE);

  // -------- footer --------
  out.push(center("¡Gracias por su compra!"));
  out.push(center("Sistema Fénix POS v0.4"));
  out.push(center("www.fenixpos.local"));

  const contentText = out.join("\n") + "\n";

  console.log("[TB] R:", R); 
console.log("[TB] U:", U);

  return {
    type: "RAW_TEXT",
    printer: impresora,
    format: "text",
    paper: PAPER,
    content: contentText,
    meta: { ticket_id: ticket.id || null, orden_id: orden?.id || null, generado_en: nowISO(), paper: PAPER }
  };
}
