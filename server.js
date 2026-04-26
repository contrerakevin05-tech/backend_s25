const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();
const PORT = process.env.PORT || 3010;

// ─── Middleware ───────────────────────────────────────────────────────────────
// origin: "*" permite peticiones desde file://, localhost y cualquier dominio (GitHub Pages)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json());

// ─── Swagger Config ───────────────────────────────────────────────────────────
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Microservicio de Facturación",
      version: "1.0.0",
      description:
        "API para calcular el valor final de una factura aplicando descuentos antes del IVA.",
      contact: {
        name: "Soporte",
      },
    },
    servers: [
      {
        url: process.env.BASE_URL || `http://localhost:${PORT}`,
        description: process.env.BASE_URL ? "Servidor en producción" : "Servidor local",
      },
    ],
  },
  apis: ["./server.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Schemas ──────────────────────────────────────────────────────────────────
/**
 * @swagger
 * components:
 *   schemas:
 *     FacturaInput:
 *       type: object
 *       required:
 *         - codigo
 *         - nombre
 *         - costeBase
 *         - iva
 *         - descuento
 *       properties:
 *         codigo:
 *           type: string
 *           example: "PROD001"
 *           description: Código alfanumérico del producto (solo letras y números)
 *         nombre:
 *           type: string
 *           example: "Laptop Empresarial"
 *           description: Nombre del producto (solo letras y espacios)
 *         costeBase:
 *           type: number
 *           minimum: 0
 *           example: 1000000
 *           description: Costo base en moneda local (no puede ser negativo)
 *         iva:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           example: 19
 *           description: Porcentaje de IVA a aplicar (0–100)
 *         descuento:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           example: 10
 *           description: Porcentaje de descuento a aplicar antes del IVA (0–100)
 *
 *     FacturaOutput:
 *       type: object
 *       properties:
 *         codigo:
 *           type: string
 *         nombre:
 *           type: string
 *         desglose:
 *           type: object
 *           properties:
 *             costeBase:
 *               type: number
 *             descuentoPorcentaje:
 *               type: number
 *             descuentoValor:
 *               type: number
 *             subtotalConDescuento:
 *               type: number
 *             ivaPorcentaje:
 *               type: number
 *             ivaValor:
 *               type: number
 *             totalAPagar:
 *               type: number
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         codigo:
 *           type: integer
 *           example: 404
 */

// ─── Ruta principal ───────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/calcular:
 *   post:
 *     summary: Calcular factura con descuento e IVA
 *     description: |
 *       Calcula el desglose completo de una factura.
 *       El descuento se aplica **antes** del IVA.
 *       - `codigo` debe ser alfanumérico (letras y números únicamente).
 *       - `nombre` debe contener solo letras y espacios.
 *       - No se aceptan valores negativos (responde 404).
 *     tags:
 *       - Facturación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FacturaInput'
 *     responses:
 *       200:
 *         description: Cálculo exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FacturaOutput'
 *       404:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post("/api/calcular", (req, res) => {
  const { codigo, nombre, costeBase, iva, descuento } = req.body;

  // ── Validar código: obligatorio y alfanumérico ────────────────────────────
  const codigoStr = String(codigo ?? "").trim();
  if (!codigoStr) {
    return res.status(404).json({ error: "El campo 'codigo' es obligatorio.", codigo: 404 });
  }
  if (!/^[a-zA-Z0-9]+$/.test(codigoStr)) {
    return res.status(404).json({
      error: "El campo 'codigo' solo permite letras y números (sin espacios ni caracteres especiales).",
      codigo: 404,
    });
  }

  // ── Validar nombre: obligatorio y solo letras/espacios ────────────────────
  const nombreStr = String(nombre ?? "").trim();
  if (!nombreStr) {
    return res.status(404).json({ error: "El campo 'nombre' es obligatorio.", codigo: 404 });
  }
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(nombreStr)) {
    return res.status(404).json({
      error: "El campo 'nombre' solo permite letras y espacios (sin números ni caracteres especiales).",
      codigo: 404,
    });
  }

  // ── Validar numéricos ─────────────────────────────────────────────────────
  const numCoste    = Number(costeBase);
  const numIva      = Number(iva);
  const numDescuento = Number(descuento);

  if (isNaN(numCoste) || isNaN(numIva) || isNaN(numDescuento)) {
    return res.status(404).json({
      error: "Los campos numéricos (costeBase, iva, descuento) deben ser números válidos.",
      codigo: 404,
    });
  }

  if (numCoste < 0 || numIva < 0 || numDescuento < 0) {
    return res.status(404).json({
      error: "No se permiten valores negativos en costeBase, iva ni descuento.",
      codigo: 404,
    });
  }

  if (numIva > 100 || numDescuento > 100) {
    return res.status(404).json({
      error: "El IVA y el descuento no pueden superar el 100%.",
      codigo: 404,
    });
  }

  // ── Cálculo (descuento ANTES del IVA) ─────────────────────────────────────
  const descuentoValor       = (numCoste * numDescuento) / 100;
  const subtotalConDescuento = numCoste - descuentoValor;
  const ivaValor             = (subtotalConDescuento * numIva) / 100;
  const totalAPagar          = subtotalConDescuento + ivaValor;

  return res.status(200).json({
    codigo: codigoStr,
    nombre: nombreStr,
    desglose: {
      costeBase:             round2(numCoste),
      descuentoPorcentaje:   round2(numDescuento),
      descuentoValor:        round2(descuentoValor),
      subtotalConDescuento:  round2(subtotalConDescuento),
      ivaPorcentaje:         round2(numIva),
      ivaValor:              round2(ivaValor),
      totalAPagar:           round2(totalAPagar),
    },
  });
});

// ─── Health check ─────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Estado del microservicio
 *     tags:
 *       - Salud
 *     responses:
 *       200:
 *         description: Microservicio en línea
 */
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Helper ───────────────────────────────────────────────────────────────────
function round2(n) {
  return Math.round(n * 100) / 100;
}

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Microservicio corriendo en http://localhost:${PORT}`);
  console.log(`📄  Swagger UI: http://localhost:${PORT}/api-docs`);
});
