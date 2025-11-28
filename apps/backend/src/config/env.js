// Lee variables de entorno y fija defaults
import "dotenv/config";

const parseOrigins = (s) => (s || "").split(",").map(x => x.trim()).filter(Boolean);

export const env = {
  port: Number(process.env.PORT || 8080),
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "fenix",
    pass: process.env.DB_PASS || "fenix",
    name: process.env.DB_NAME || "taqueria_oasis_db",
  },
  printerUrl: process.env.PRINTER_SERVICE_URL || "http://localhost:9101",
  cors: { origins: parseOrigins(process.env.CORS_ORIGINS) },
  jwt: {
    secret: process.env.JWT_SECRET || "change_me_dev",
    expiresIn: process.env.JWT_EXPIRES || "8h",
  },
};
