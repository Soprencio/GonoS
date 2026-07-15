const { Router } = require('express');
const path = require('path');
const pool = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { upload, deleteFileIfExists, UPLOAD_DIR } = require('../middleware/upload');

const router = Router();

// ── Helpers ──

async function getParticipacion(usuarioId, claseId) {
  const [rows] = await pool.execute(
    `SELECT p.participacion_id, r.nombre AS rol
     FROM participaciones p
     JOIN roles r ON p.rol_id = r.rol_id
     WHERE p.usuario_id = ? AND p.clase_id = ?`,
    [usuarioId, claseId]
  );
  return rows[0] || null;
}

// ── POST /api/asignaciones/:asignacionId/entregas — subir/actualizar entrega (Alumno)
// Regla de negocio: si ya existe una entrega y la fecha límite no pasó,
// se REEMPLAZA el archivo anterior (borrando el viejo del disco).
// Si la fecha límite ya pasó, se permite igual pero se marca como "Entrega tardía".
router.post(
  '/asignaciones/:asignacionId/entregas',
  requireAuth,
  (req, res, next) => {
    upload.single('archivo')(req, res, err => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: `Archivo demasiado grande (máx ${Math.round(require('../middleware/upload').MAX_FILE_SIZE / 1024 / 1024)}MB)` });
        }
        if (err.multerCode === 'BAD_EXTENSION') {
          return res.status(400).json({ error: err.message });
        }
        return next(err);
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ningún archivo' });
    }

    try {
      // Verificar que la asignación exista y pertenezca al usuario
      const [asignaciones] = await pool.execute(
        `SELECT a.asignacion_id, a.estado, a.participacion_id,
                t.tp_id, t.clase_id, t.fecha_entrega, t.formatos_aceptados
         FROM asignacion a
         JOIN trabajos t ON a.tp_id = t.tp_id
         WHERE a.asignacion_id = ?`,
        [req.params.asignacionId]
      );

      if (asignaciones.length === 0) {
        await deleteFileIfExists(req.file.path);
        return res.status(404).json({ error: 'Asignación no encontrada' });
      }

      const asig = asignaciones[0];
      const participacion = await getParticipacion(req.user.id, asig.clase_id);

      if (!participacion || participacion.participacion_id !== asig.participacion_id) {
        await deleteFileIfExists(req.file.path);
        return res.status(403).json({ error: 'Esta asignación no te pertenece' });
      }

      if (participacion.rol !== 'Alumno') {
        await deleteFileIfExists(req.file.path);
        return res.status(403).json({ error: 'Solo alumnos pueden realizar entregas' });
      }

      // Validar extensión contra formatos_aceptados del trabajo
      const ext = path.extname(req.file.originalname).toLowerCase();
      const formatos = typeof asig.formatos_aceptados === 'string'
        ? JSON.parse(asig.formatos_aceptados)
        : asig.formatos_aceptados;

      if (!formatos.includes(ext)) {
        await deleteFileIfExists(req.file.path);
        return res.status(400).json({
          error: `Formato ${ext} no está entre los formatos aceptados para este trabajo (${formatos.join(', ')})`
        });
      }

      // Determinar si es tardía
      const ahora = new Date();
      const fechaLimite = new Date(asig.fecha_entrega);
      const esTardia = ahora > fechaLimite;

      const pathRelativo = req.file.path
        .replace(/\\/g, '/')
        .replace(/^.*?uploads\//, '');

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // Buscar entrega existente para reemplazo
        const [existentes] = await conn.execute(
          'SELECT entrega_id, archivo FROM entrega WHERE asignacion_id = ? ORDER BY created_at DESC LIMIT 1',
          [req.params.asignacionId]
        );

        if (existentes.length > 0) {
          // Reemplazar: eliminar archivo anterior del disco
          const vieja = existentes[0];
          const viejoPath = path.join(UPLOAD_DIR, vieja.archivo);
          await deleteFileIfExists(viejoPath);

          // Actualizar fila existente
          await conn.execute(
            'UPDATE entrega SET archivo = ?, nombre_original = ?, fecha_entrega = ?, devolucion = ? WHERE entrega_id = ?',
            [pathRelativo, req.file.originalname, ahora, esTardia ? 'Entrega tardía' : null, vieja.entrega_id]
          );
        } else {
          // Primera entrega
          await conn.execute(
            'INSERT INTO entrega (asignacion_id, archivo, nombre_original, fecha_entrega, devolucion) VALUES (?, ?, ?, ?, ?)',
            [req.params.asignacionId, pathRelativo, req.file.originalname, ahora, esTardia ? 'Entrega tardía' : null]
          );
        }

        // Actualizar estado de la asignación
        await conn.execute(
          'UPDATE asignacion SET estado = "En revisión" WHERE asignacion_id = ?',
          [req.params.asignacionId]
        );

        await conn.commit();

        res.status(201).json({
          mensaje: existentes.length > 0 ? 'Entrega actualizada correctamente' : 'Trabajo entregado correctamente',
          tardia: esTardia
        });
      } catch (err) {
        await conn.rollback();
        await deleteFileIfExists(req.file.path);
        throw err;
      } finally {
        conn.release();
      }
    } catch (err) {
      if (req.file) await deleteFileIfExists(req.file.path);
      console.error('Error al entregar trabajo:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

// ── GET /api/trabajos/:trabajoId/entregas — listar entregas de un trabajo (solo Profesor)
router.get('/trabajos/:trabajoId/entregas', requireAuth, async (req, res) => {
  try {
    const [tps] = await pool.execute(
      'SELECT clase_id FROM trabajos WHERE tp_id = ?',
      [req.params.trabajoId]
    );

    if (tps.length === 0) {
      return res.status(404).json({ error: 'Trabajo no encontrado' });
    }

    const participacion = await getParticipacion(req.user.id, tps[0].clase_id);
    if (!participacion || participacion.rol !== 'Profesor') {
      return res.status(403).json({ error: 'Solo el profesor puede ver las entregas de este trabajo' });
    }

    const [entregas] = await pool.execute(
      `SELECT e.entrega_id, e.archivo, e.nombre_original, e.fecha_entrega, e.devolucion,
              a.asignacion_id, a.estado, a.nota,
               u.usuario_id, u.nombre AS alumno_nombre, u.apellido AS alumno_apellido, u.mail AS alumno_mail
       FROM entrega e
       JOIN asignacion a ON e.asignacion_id = a.asignacion_id
       JOIN participaciones p ON a.participacion_id = p.participacion_id
       JOIN usuarios u ON p.usuario_id = u.usuario_id
       WHERE a.tp_id = ?
       ORDER BY e.fecha_entrega DESC`,
      [req.params.trabajoId]
    );

    res.json(entregas);
  } catch (err) {
    console.error('Error al listar entregas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /api/entregas/:id — detalle de una entrega
router.get('/entregas/:id', requireAuth, async (req, res) => {
  try {
    const [entregas] = await pool.execute(
      `SELECT e.*, a.tp_id, a.estado AS asignacion_estado, a.nota,
              p.usuario_id, p.clase_id,
              u.nombre AS alumno_nombre, u.apellido AS alumno_apellido
       FROM entrega e
       JOIN asignacion a ON e.asignacion_id = a.asignacion_id
       JOIN participaciones p ON a.participacion_id = p.participacion_id
       JOIN usuarios u ON p.usuario_id = u.usuario_id
       WHERE e.entrega_id = ?`,
      [req.params.id]
    );

    if (entregas.length === 0) {
      return res.status(404).json({ error: 'Entrega no encontrada' });
    }

    const entrega = entregas[0];
    const participacion = await getParticipacion(req.user.id, entrega.clase_id);

    if (!participacion) {
      return res.status(403).json({ error: 'No tenés acceso a esta entrega' });
    }

    // Alumno: solo puede ver su propia entrega
    if (participacion.rol === 'Alumno' && entrega.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No tenés acceso a esta entrega' });
    }

    // Profesor: solo si es de su clase (ya verificado por getParticipacion)

    res.json({
      entrega_id: entrega.entrega_id,
      asignacion_id: entrega.asignacion_id,
      archivo: entrega.archivo,
      nombre_original: entrega.nombre_original,
      fecha_entrega: entrega.fecha_entrega,
      devolucion: entrega.devolucion,
      tp_id: entrega.tp_id,
      estado: entrega.asignacion_estado,
      nota: entrega.nota,
      rol: participacion.rol,
      alumno: {
        id: entrega.usuario_id,
        nombre: `${entrega.alumno_nombre} ${entrega.alumno_apellido}`
      }
    });
  } catch (err) {
    console.error('Error al obtener entrega:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /api/entregas/:id/descargar — servir archivo original (autenticado)
router.get('/entregas/:id/descargar', requireAuth, async (req, res) => {
  try {
    const [entregas] = await pool.execute(
      `SELECT e.archivo, e.nombre_original, a.tp_id,
              p.usuario_id, p.clase_id
       FROM entrega e
       JOIN asignacion a ON e.asignacion_id = a.asignacion_id
       JOIN participaciones p ON a.participacion_id = p.participacion_id
       WHERE e.entrega_id = ?`,
      [req.params.id]
    );

    if (entregas.length === 0) {
      return res.status(404).json({ error: 'Entrega no encontrada' });
    }

    const entrega = entregas[0];
    const participacion = await getParticipacion(req.user.id, entrega.clase_id);

    if (!participacion) {
      return res.status(403).json({ error: 'No tenés acceso a esta entrega' });
    }

    if (participacion.rol === 'Alumno' && entrega.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No tenés acceso a esta entrega' });
    }

    const filePath = path.join(UPLOAD_DIR, entrega.archivo);
    res.download(filePath, entrega.nombre_original);
  } catch (err) {
    console.error('Error al descargar entrega:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
