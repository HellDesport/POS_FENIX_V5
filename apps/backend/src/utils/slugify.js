// apps/backend/src/utils/slugify.js
// Convierte "Tacos Ándale #1!" → "tacos-andale-1"
export function slugify(input, maxLen = 80) {
  return String(input ?? "")
    .normalize("NFD")                 // separa acentos
    .replace(/\p{Diacritic}/gu, "")   // quita diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")      // no alfanumérico → "-"
    .replace(/^-+|-+$/g, "")          // trim "-"
    .replace(/-+/g, "-")              // colapsa "--"
    .slice(0, maxLen)
    .replace(/-+$/g, "");
}
