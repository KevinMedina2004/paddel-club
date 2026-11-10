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

// --- RUTAS DE LA API ---

// Obtener todas las reservas de la base de datos
app.get('/api/reservas', async (req, res) => {
  try {
    // Si la tabla no existe aún, evitamos que crashee devolviendo un arreglo vacío
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
        estado VARCHAR(20) DEFAULT 'Reservado'
      );
    `;
    await pool.query(query);

    const result = await pool.query('SELECT * FROM reservas ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("Error al consultar reservas:", err);
    res.status(500).json({ error: "Error en el servidor al consultar la base de datos" });
  }
});

// Crear una nueva reserva
app.post('/api/reservas', async (req, res) => {
  const { cancha, horario, dia, fecha, cliente, telefono, precio, metodo_pago } = req.body;
  try {
    const query = `
      INSERT INTO reservas (cancha, horario, dia, fecha, cliente, telefono, precio, metodo_pago)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
    `;
    const values = [cancha, horario, dia, fecha, cliente, telefono, precio, metodo_pago];
    const nuevaReserva = await pool.query(query, values);
    res.status(201).json(nuevaReserva.rows[0]);
  } catch (err) {
    console.error("Error al guardar reserva:", err);
    res.status(500).json({ error: "Error al registrar la reserva en la base de datos" });
  }
});

// Eliminar / Cancelar reserva (Panel Staff)
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
  console.log(`Servidor de Paddel Club corriendo en http://localhost:${PORT}`);
});