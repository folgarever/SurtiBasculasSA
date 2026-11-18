require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const express = require('express');
const corsMiddleware = require('./src/config/cors');
const authRoutes = require('./src/routes/authRoutes');
const asistenciaRoutes = require('./src/routes/asistenciaRoutes');
const rrhhRoutes = require('./src/routes/rrhhRoutes');
const evaluacionesRoutes = require('./src/routes/evaluacionesRoutes');
const evaluacionesConocimientoRoutes = require('./src/routes/evaluacionesConocimientoRoutes');
const evaluacionesSeleccionRoutes = require('./src/routes/evaluacionesSeleccionRoutes');
const sugerenciasRoutes = require('./src/routes/sugerenciasRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const pool = require('./src/config/db');

const app = express();

app.use(corsMiddleware);
app.use(express.json({ limit: '256kb' }));

app.get('/', (req, res) => {
  res.json({ estado: 'ok', servicio: 'SURTIBASCULAS API' });
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.execute('SELECT 1');
    return res.json({ estado: 'ok', base_de_datos: 'ok' });
  } catch (error) {
    console.error('Health check de base de datos falló:', error.message);
    return res.status(500).json({ estado: 'error', base_de_datos: 'error' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/asistencia', asistenciaRoutes);
app.use('/api/rrhh', rrhhRoutes);
app.use('/api/evaluaciones', evaluacionesRoutes);
app.use('/api/evaluaciones-conocimiento', evaluacionesConocimientoRoutes);
app.use('/api/evaluaciones-seleccion', evaluacionesSeleccionRoutes);
app.use('/api/sugerencias', sugerenciasRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada.' });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);

  const status = Number(error.status || error.statusCode);
  if (status >= 400 && status < 500) {
    return res.status(status).json({ mensaje: error.message || 'Solicitud inválida.' });
  }

  return res.status(500).json({ mensaje: 'Error interno del servidor.' });
});

const port = Number(process.env.PORT || 3000);
if (require.main === module) {
  app.listen(port, () => {
    console.log(`SURTIBASCULAS API escuchando en el puerto ${port}`);
  });
}

module.exports = app;
