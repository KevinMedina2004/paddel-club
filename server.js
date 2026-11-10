const express = require('express');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de la Base de Datos (Neon PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// --- INICIALIZAR TABLA CON NUEVOS CAMPOS ---
async function inicializarBaseDatos() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS reservas (
        id SERIAL PRIMARY KEY,
        cancha INT,
        horario VARCHAR(20),
        dia VARCHAR(20),
        fecha VARCHAR(20),
        cliente VARCHAR(100),
        telefono VARCHAR(50),
        precio NUMERIC,
        metodo_pago VARCHAR(20),
        sena NUMERIC DEFAULT 15000,
        comprobante VARCHAR(100),
        estado_pago VARCHAR(20) DEFAULT 'Pendiente',
        estado VARCHAR(20) DEFAULT 'Reservado'
      );
    `;
    await pool.query(query);
    console.log("Base de datos de San Esteban Paddle Club verificada correctamente.");
  } catch (err) {
    console.error("Error al inicializar la base de datos:", err);
  }
}
inicializarBaseDatos();

// --- RUTAS DE LA API ---

// Obtener todas las reservas
app.get('/api/reservas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reservas ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("Error al consultar reservas:", err);
    res.status(500).json({ error: "Error en el servidor al consultar la base de datos" });
  }
});

// Crear una nueva reserva (Cliente)
app.post('/api/reservas', async (req, res) => {
  const { cancha, horario, dia, fecha, cliente, telefono, precio, metodo_pago, comprobante } = req.body;
  try {
    const query = `
      INSERT INTO reservas (cancha, horario, dia, fecha, cliente, telefono, precio, metodo_pago, sena, comprobante, estado_pago)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 15000, $9, 'Pendiente') RETURNING *;
    `;
    const values = [cancha, horario, dia, fecha, cliente, telefono, precio, metodo_pago, comprobante || 'Sin comprobante'];
    const nuevaReserva = await pool.query(query, values);
    res.status(201).json(nuevaReserva.rows[0]);
  } catch (err) {
    console.error("Error al guardar reserva:", err);
    res.status(500).json({ error: "Error al registrar la reserva en la base de datos" });
  }
});

// Aprobar o rechazar seña / pago (Panel Admin)
app.patch('/api/reservas/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado_pago } = req.body; // 'Aprobado' o 'Rechazado'
  try {
    const result = await pool.query(
      'UPDATE reservas SET estado_pago = $1 WHERE id = $2 RETURNING *;',
      [estado_pago, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error al actualizar estado de pago:", err);
    res.status(500).json({ error: "Error al actualizar el pago" });
  }
});

// Eliminar / Cancelar reserva
app.delete('/api/reservas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM reservas WHERE id = $1', [id]);
    res.json({ mensaje: "Reserva eliminada con éxito" });
  } catch (err) {
    console.error("Error al eliminar reserva:", err);
    res.status(500).json({ error: "Error al eliminar la reserva" });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`San Esteban Paddle Club corriendo en http://localhost:${PORT}`);
});