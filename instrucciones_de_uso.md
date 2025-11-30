instalar node.js v18 LTS o superior
https://nodejs.org/es/blog/release/v18.18.0

1.-Intalar dependencias Node em:
cd apps/backend
npm install


2.-Variables de entorno:
 en cd apps/backend
 crear un .env 
 ejemplo de .env:
 =========================================
 # Puertos separados por rol
PORT_PROPIETARIO=8081
PORT_TERMINAL=8082

# Configuración de base de datos (local o en la nube)
DB_HOST=localhost
DB_PORT=*****
DB_USER=root
DB_PASS=*******
DB_NAME=taqueria_oasis_db (nombre de la base alojada)

# Servicio impresora 
PRINTER_SERVICE_URL=http://localhost:9100
PRINTER_SERVICE_PATH=printer-service


# Orígenes CORS
CORS_ORIGINS=*

# Tokens
JWT_SECRET=cambia_esto_por_un_secreto_largo
JWT_EXPIRES=8h
=========================================
Tablas y Trigger ubicadas en apps/db/
 - Fenix_Fase4_v0.4_TABLES.txt
 - Fenix_Triggers_v0.4.txt

 comando de ejecucion: cd apps/backend
Modulo Propietario.
npm run dev:propietario   # backend del propietario (puerto .env PORT_PROPIETARIO)

Modulo Terminal.
npm run dev:terminal      # backend del terminal POS (puerto .env PORT_TERMINAL)

#######################################################################################
IMPORTANTE:
Actualmente el módulo de impresoras está en reconstrucción.
Las carpetas internas del servicio de impresión fueron eliminadas el 28/11/25 (6:40am).

Por esta razón aparecerá este mensaje al iniciar la Terminal:

   ⚠ Printer Service no responde. Intentando iniciar...
   ❌ No pude ubicar 'printer-service'. Define PRINTER_SERVICE_PATH o revisa la estructura.

Este mensaje ES NORMAL por ahora.
Ignóralo: el POS funciona sin la impresora.
