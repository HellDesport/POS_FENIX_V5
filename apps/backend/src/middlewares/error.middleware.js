export function errorHandler(err, req, res, next) {
  if (!err) return res.status(500).json({ message: "Error desconocido" });

  const status = Number.isInteger(err.status) ? err.status : 500;
  const body = { message: err.message || "Error interno del servidor" };

  if (process.env.NODE_ENV !== "production" && err.stack)
    body.stack = err.stack;

  console.error(`[${req.method}] ${req.originalUrl} -> ${status}: ${body.message}`);
  res.status(status).json(body);
}
