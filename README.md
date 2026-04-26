# Microservicio de Facturación

Microservicio REST construido con **Node.js + Express** que calcula el desglose completo de una factura aplicando descuentos (antes del IVA) e IVA.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/calcular` | Calcula la factura |
| GET | `/api/health` | Estado del servicio |
| GET | `/api-docs` | Documentación Swagger |

## Instalación local

```bash
npm install
npm start        # producción
npm run dev      # desarrollo con nodemon
```

El servidor levanta por defecto en **http://localhost:3010**.

## Variables de entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `3010` |
| `BASE_URL` | URL base pública (Render) | `http://localhost:3010` |

## Despliegue en Render

1. Crear un nuevo **Web Service** en [render.com](https://render.com).
2. Conectar el repositorio de GitHub (rama `main`).
3. Configurar:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variable:** `BASE_URL` → URL pública que asigne Render (ej. `https://mi-servicio.onrender.com`)
4. Render asigna automáticamente `PORT`; el código lo usa con `process.env.PORT || 3010`.

## Reglas de validación

- No se aceptan valores negativos → responde **HTTP 404**.
- No se acepta el carácter `e` (notación científica) → rechazado en el frontend antes del envío.
- `iva` y `descuento` deben estar entre 0 y 100.
- El descuento se aplica **antes** del IVA.

## Ejemplo de request / response

```json
POST /api/calcular
{
  "codigo": "PROD-001",
  "nombre": "Laptop Empresarial",
  "costeBase": 1000000,
  "iva": 19,
  "descuento": 10
}
```

```json
HTTP 200
{
  "codigo": "PROD-001",
  "nombre": "Laptop Empresarial",
  "desglose": {
    "costeBase": 1000000,
    "descuentoPorcentaje": 10,
    "descuentoValor": 100000,
    "subtotalConDescuento": 900000,
    "ivaPorcentaje": 19,
    "ivaValor": 171000,
    "totalAPagar": 1071000
  }
}
```
