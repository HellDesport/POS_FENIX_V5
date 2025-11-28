Modulo Propietario.
npm run dev:propietario   # backend del propietario (puerto .env PORT_PROPIETARIO)

Modulo Terminal.
npm run dev:terminal      # backend del terminal POS (puerto .env PORT_TERMINAL)


objetivos: 
Tests básicos en Postman:

.-Crear propietario. /api/auth/register-propietario
{
  "propietario": {
    "nombre": "Joel Fénix",
    "razon_social": "Fénix POS SA de CV",
    "telefono": "811-000-0000"
  },
  "usuario": {
     "email": "admin@fenix.local",
      "password": "admin123"
  }
}


.-Crear restaurante (debería crear mesas automáticamente). (Terminado)
.-Crear categorías y subcategorías. (Terminado)
.-Crear productos (solo dentro de subcategorías). (Terminado)
Verificar vista vw_mesas_estado_propietario.

Fenix/
 └─ apps/
     └─ backend/
         └─ src/
             ├─ app_propietario.js                       # Punto de arranque Rol Propietario
             ├─ app_terminal.js                          # Punto de arranque Rol Termial
             ├─ config/                         # Configuraciones globales
             │   ├─ db.js                       # Conexión a MySQL
             │   └─ env.js                      # Variables de entorno
             │
             ├─ middlewares/                    # Middlewares comunes
             │   ├─ auth.middleware.js          # Verifica JWT y roles
             │   ├─ error.middleware.js         # Manejo centralizado de errores
             │   └─ logger.middleware.js        # Logging de peticiones
             │
             └─ modules/
                 ├─ auth/                       # Módulo de autenticación
                 │   ├─ auth.controller.js
                 │   ├─ auth.service.js
                 │   ├─ auth.routes.js
                 │   └─ auth.middleware.js      # Maneja requireAuth()
                 │
                 ├─ impresoras/                 # (Fase 6) Configuración de impresoras locales
                 │   ├─ impresora.controller.js
                 │   ├─ impresora.service.js
                 │   ├─ impresora.repo.js
                 │   └─ impresora.routes.js
                 │
                 ├─ propietario/                # ROL PROPIETARIO (Administración general)
                 │   ├─ propietario.controller.js
                 │   ├─ propietario.service.js
                 │   ├─ propietario.repo.js
                 │   ├─ propietario.routes.js
                 │   │
                 │   └─ restaurante/            # Gestión de restaurantes del propietario
                 │       ├─ restaurante.controller.js
                 │       ├─ restaurante.service.js
                 │       ├─ restaurante.repo.js
                 │       ├─ restaurante.routes.js
                 │       │
                 │       ├─ categoria_producto/
                 │       │   ├─ categoria_producto.controller.js
                 │       │   ├─ categoria_producto.service.js
                 │       │   ├─ categoria_producto.repo.js
                 │       │   └─ categoria_producto.routes.js
                 │       │
                 │       ├─ producto/
                 │       │   ├─ producto.controller.js
                 │       │   ├─ producto.service.js
                 │       │   ├─ producto.repo.js
                 │       │   └─ producto.routes.js
                 │       │
                 │       │
                 │       ├─ empleados/
                 │       │   ├─ empleados.controller.js
                 │       │   ├─ empleados.service.js
                 │       │   ├─ empleados.repo.js
                 │       │   └─ empleados.routes.js
                 │       │
                 │       └─ ordenes/            # Solo vistas/auditoría del propietario
                 │           ├─ ordenes.controller.js
                 │           ├─ ordenes.service.js
                 │           ├─ ordenes.repo.js
                 │           └─ ordenes.routes.js
                 │                            
                 └─ terminal/                   # ROL TERMINAL (Punto de venta local)
                      ├─ mesas/
                      │   ├─ mesas.controller.js
                      │   ├─ mesas.service.js
                      │   ├─ mesas.repo.js
                      │   └─ mesas.routes.js
                      │
                      ├─ ordenes/
                      │   ├─ ordenes.controller.js
                      │   ├─ ordenes.service.js
                      │   ├─ ordenes.repo.js
                      │   └─ ordenes.routes.js
                      │
                      ├─ orden_detalle/
                      │   ├─ orden_detalle.controller.js
                      │   ├─ orden_detalle.service.js
                      │   ├─ orden_detalle.repo.js
                      │   └─ orden_detalle.routes.js
                      │
                      ├─ restaurante/
                      │   ├─ restaurante.controller.js
                      │   ├─ restaurante.service.js
                      │   ├─ restaurante.repo.js
                      │   └─ restaurante.routes.js
                      │
                      └─ terminal.controller.js
                      └─ terminal.service.js
                      └─ terminal.repo.js
                      └─ terminal.routes.js

                      Revision Posteriory
                      Checklist API – Propietario (Postman)
                      1️⃣ Login Propietario

                      POST /api/auth/login
                      Payload:
                      {
                        "email": "admin@fenix.local",
                        "password": "admin123"
                      }
