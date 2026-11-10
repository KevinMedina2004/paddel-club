const express = require('express');
const path = require('path');
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos directamente desde la raíz del proyecto
app.use(express.static(path.join(__dirname)));

// --- RUTAS DE EJEMPLO DE LA API ---

// Obtener datos (ejemplo de consulta a Neon)
app.get('/api/reservas', async (req, res) => {
  try {
    // const result = await pool.query('SELECT * FROM reservas ORDER BY id DESC');
    // res.json(result.rows);
    res.json({ mensaje: "Conexión exitosa con la API de Paddel Club" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en el servidor al consultar la base de datos" });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor de Paddel Club corriendo en http://localhost:${PORT}`);
});