const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const app = express();
const PORT = process.env.PORT || 3010;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ─── Middleware ───────────────────────────────────────────────────────────────
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
        url: BASE_URL,
        description: process.env.BASE_URL ? "Servidor en producción" : "Servidor local",
      },
    ],
  },
  apis: ["./server.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ─── Swagger UI + JSON spec ───────────────────────────────────────────────────
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      url: `${BASE_URL}/api-docs/swagger.json`,
    },
  })
);

app.get("/api-docs/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json(swaggerSpec);
});

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
 *         nombre:
 *           type: string
 *           example: "Laptop"
 *         costeBase:
 *           type: number
 *           example: 1000000
 *         iva:
 *           type: number
 *           example: 19
 *         descuento:
 *           type: number
 *           example: 10
 *     FacturaOutput:
 *       type: object
 *       properties:
 *         codigo:
 *           type: string
 *         nombre:
 *           type: string
 *         costeBase:
 *           type: number
 *         descuento:
 *           type: number
 *         baseConDescuento:
 *           type: number
 *         iva:
 *           type: number
 *         totalConIva:
 *           type: number
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /:
 *   get:
 *     summary: Health check
 *     description: Verifica que el microservicio esté activo.
 *     responses:
 *       200:
 *         description: Servicio activo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Microservicio de Facturación activo"
 */
app.get("/", (req, res) => {
  res.json({ message: "Microservicio de Facturación activo" });
});

/**
 * @swagger
 * /factura:
 *   post:
 *     summary: Calcular factura
 *     description: Calcula el valor final de una factura aplicando descuento antes del IVA.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FacturaInput'
 *     responses:
 *       200:
 *         description: Factura calculada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FacturaOutput'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Alias usado por el frontend (contrerakevin05-tech.github.io)
app.post("/api/calcular", (req, res) => calcularFactura(req, res));
app.post("/factura",      (req, res) => calcularFactura(req, res));

function calcularFactura(req, res) {
  const { codigo, nombre, costeBase, iva, descuento } = req.body;

  if (
    !codigo || !nombre ||
    costeBase === undefined || iva === undefined || descuento === undefined
  ) {
    return res.status(400).json({ error: "Todos los campos son obligatorios." });
  }

  if (
    typeof costeBase !== "number" ||
    typeof iva !== "number" ||
    typeof descuento !== "number"
  ) {
    return res.status(400).json({ error: "costeBase, iva y descuento deben ser números." });
  }

  if (descuento < 0 || descuento > 100) {
    return res.status(400).json({ error: "El descuento debe estar entre 0 y 100." });
  }

  if (iva < 0) {
    return res.status(400).json({ error: "El IVA no puede ser negativo." });
  }

  const baseConDescuento = costeBase * (1 - descuento / 100);
  const descuentoValor   = costeBase - baseConDescuento;
  const ivaValor         = baseConDescuento * (iva / 100);
  const totalConIva      = baseConDescuento + ivaValor;

  res.json({
    codigo,
    nombre,
    desglose: {
      costeBase:            parseFloat(costeBase.toFixed(2)),
      descuentoPorcentaje:  descuento,
      descuentoValor:       parseFloat(descuentoValor.toFixed(2)),
      subtotalConDescuento: parseFloat(baseConDescuento.toFixed(2)),
      ivaPorcentaje:        iva,
      ivaValor:             parseFloat(ivaValor.toFixed(2)),
      totalAPagar:          parseFloat(totalConIva.toFixed(2)),
    },
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Servidor corriendo en ${BASE_URL}`);
  console.log(`Swagger UI: ${BASE_URL}/api-docs`);
});
