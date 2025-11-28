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

POST/api/propietarios/1/restaurantes
Crear Restaurante

{
  "nombre": "Taquería Fénix",
  "calle": "Av. Revolución",
  "numero_ext": "123",
  "colonia": "Centro",
  "municipio": "Guadalupe",
  "estado": "Nuevo León",
  "codigo_postal": "67100",
  "referencia": "Frente a la plaza principal",
  "total_mesas": 5
}

POST /api/propietarios/1/restaurantes/1/empleados
Register_Restaruante 1: 

{
  "nombre": "Terminal Fénix",
  "email": "terminal1@local.com",
  "password": "12345",
  "rol_local": "TERMINAL",
  "restaurante_id": 1
}
POST /api/propietarios/1/restaurantes/2/empleados
Register_restaurante 2: 

{
  "nombre": "Terminal del Sol",
  "email": "terminal2@local.com",
  "password": "12345",
  "rol_local": "TERMINAL",
  "restaurante_id": 2
}