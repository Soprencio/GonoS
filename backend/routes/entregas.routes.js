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

async function deleteOldExtras(entregaId) {
  const [extras] = await pool.execute(
    'SELECT archivo_extra_id, nombre FROM archivo_extra WHERE entrega_id = ?',
    [entregaId]
  );
  for (const ex of extras) {
    const p = path.join(UPLOAD_DIR, ex.nombre);
    await deleteFileIfExists(p);
  }
  await pool.execute('DELETE FROM archivo_extra WHERE entrega_id = ?', [entregaId]);
}

// ── POST /api/asignaciones/:asignacionId/entregas — subir/actualizar entrega (Alumno)
router.post(
  '/asignaciones/:asignacionId/entregas',
  requireAuth,
  (req, res, next) => {
    upload.fields([
      { name: 'archivo', maxCount: 1 },
      { name: 'archivos_extra', maxCount: 20 }
    ])(req, res, err => {
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
    if (!req.files || !req.files.archivo || req.files.archivo.length === 0) {
      return res.status(400).json({ error: 'No se envió ningún archivo' });
    }

    const mainFile = req.files.archivo[0];
    const extraFiles = req.files.archivos_extra || [];

    try {
      const [asignaciones] = await pool.execute(
        `SELECT a.asignacion_id, a.estado, a.participacion_id,
                t.tp_id, t.clase_id, t.fecha_entrega, t.formatos_aceptados
         FROM asignacion a
         JOIN trabajos t ON a.tp_id = t.tp_id
         WHERE a.asignacion_id = ?`,
        [req.params.asignacionId]
      );

      if (asignaciones.length === 0) {
        await deleteFileIfExists(mainFile.path);
        for (const ef of extraFiles) await deleteFileIfExists(ef.path);
        return res.status(404).json({ error: 'Asignación no encontrada' });
      }

      const asig = asignaciones[0];
      const participacion = await getParticipacion(req.user.id, asig.clase_id);

      if (!participacion || participacion.participacion_id !== asig.participacion_id) {
        await deleteFileIfExists(mainFile.path);
        for (const ef of extraFiles) await deleteFileIfExists(ef.path);
        return res.status(403).json({ error: 'Esta asignación no te pertenece' });
      }

      if (participacion.rol !== 'Alumno') {
        await deleteFileIfExists(mainFile.path);
        for (const ef of extraFiles) await deleteFileIfExists(ef.path);
        return res.status(403).json({ error: 'Solo alumnos pueden realizar entregas' });
      }

      const ext = path.extname(mainFile.originalname).toLowerCase();
      const formatos = typeof asig.formatos_aceptados === 'string'
        ? JSON.parse(asig.formatos_aceptados)
        : asig.formatos_aceptados;

      if (!formatos.includes(ext)) {
        await deleteFileIfExists(mainFile.path);
        for (const ef of extraFiles) await deleteFileIfExists(ef.path);
        return res.status(400).json({
          error: `Formato ${ext} no está entre los formatos aceptados para este trabajo (${formatos.join(', ')})`
        });
      }

      const ahora = new Date();
      const fechaLimite = new Date(asig.fecha_entrega);
      const esTardia = ahora > fechaLimite;

      const pathRelativo = mainFile.path
        .replace(/\\/g, '/')
        .replace(/^.*?uploads\//, '');

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const [existentes] = await conn.execute(
          'SELECT entrega_id, archivo FROM entrega WHERE asignacion_id = ? ORDER BY created_at DESC LIMIT 1',
          [req.params.asignacionId]
        );

        let entregaId;
        if (existentes.length > 0) {
          const vieja = existentes[0];
          entregaId = vieja.entrega_id;
          const viejoPath = path.join(UPLOAD_DIR, vieja.archivo);
          await deleteFileIfExists(viejoPath);
          await deleteOldExtras(entregaId);

          await conn.execute(
            'UPDATE entrega SET archivo = ?, nombre_original = ?, fecha_entrega = ?, devolucion = ? WHERE entrega_id = ?',
            [pathRelativo, mainFile.originalname, ahora, esTardia ? 'Entrega tardía' : null, entregaId]
          );
        } else {
          const [result] = await conn.execute(
            'INSERT INTO entrega (asignacion_id, archivo, nombre_original, fecha_entrega, devolucion) VALUES (?, ?, ?, ?, ?)',
            [req.params.asignacionId, pathRelativo, mainFile.originalname, ahora, esTardia ? 'Entrega tardía' : null]
          );
          entregaId = result.insertId;
        }

        for (const ef of extraFiles) {
          const relPath = ef.path.replace(/\\/g, '/').replace(/^.*?uploads\//, '');
          await conn.execute(
            'INSERT INTO archivo_extra (entrega_id, nombre, nombre_original) VALUES (?, ?, ?)',
            [entregaId, relPath, ef.originalname]
          );
        }

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
        await deleteFileIfExists(mainFile.path);
        for (const ef of extraFiles) await deleteFileIfExists(ef.path);
        throw err;
      } finally {
        conn.release();
      }
    } catch (err) {
      if (mainFile) await deleteFileIfExists(mainFile.path);
      for (const ef of extraFiles) await deleteFileIfExists(ef.path);
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

    if (participacion.rol === 'Alumno' && entrega.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No tenés acceso a esta entrega' });
    }

    const [archivosExtra] = await pool.execute(
      'SELECT archivo_extra_id, nombre, nombre_original FROM archivo_extra WHERE entrega_id = ?',
      [entrega.entrega_id]
    );

    const extras = archivosExtra.map(ex => ({
      id: ex.archivo_extra_id,
      nombre: ex.nombre,
      nombre_original: ex.nombre_original
    }));

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
      archivos_extra: extras,
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

// ── GET /api/entregas/:id/archivos/:archivoExtraId — descargar archivo extra
router.get('/entregas/:id/archivos/:archivoExtraId', requireAuth, async (req, res) => {
  try {
    const [entregas] = await pool.execute(
      `SELECT e.archivo, a.tp_id,
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

    const [extras] = await pool.execute(
      'SELECT nombre, nombre_original FROM archivo_extra WHERE archivo_extra_id = ? AND entrega_id = ?',
      [req.params.archivoExtraId, req.params.id]
    );

    if (extras.length === 0) {
      return res.status(404).json({ error: 'Archivo extra no encontrado' });
    }

    const filePath = path.join(UPLOAD_DIR, extras[0].nombre);
    res.download(filePath, extras[0].nombre_original);
  } catch (err) {
    console.error('Error al descargar archivo extra:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── PATCH /api/entregas/:id/nota — guardar nota (solo Profesor)
router.patch('/entregas/:id/nota', requireAuth, async (req, res) => {
  const { nota } = req.body;

  if (nota === undefined || nota === null || isNaN(nota)) {
    return res.status(400).json({ error: 'La nota es obligatoria y debe ser un número' });
  }

  const notaNum = parseFloat(nota);
  if (notaNum < 0 || notaNum > 10) {
    return res.status(400).json({ error: 'La nota debe estar entre 0 y 10' });
  }

  try {
    const [entregas] = await pool.execute(
      `SELECT e.entrega_id, e.asignacion_id, t.clase_id
       FROM entrega e
       JOIN asignacion a ON e.asignacion_id = a.asignacion_id
       JOIN trabajos t ON a.tp_id = t.tp_id
       WHERE e.entrega_id = ?`,
      [req.params.id]
    );

    if (entregas.length === 0) {
      return res.status(404).json({ error: 'Entrega no encontrada' });
    }

    const participacion = await getParticipacion(req.user.id, entregas[0].clase_id);
    if (!participacion || participacion.rol !== 'Profesor') {
      return res.status(403).json({ error: 'Solo el profesor puede calificar' });
    }

    const estadoFinal = notaNum >= 6 ? 'Aprobado' : 'Revisado';

    await pool.execute(
      'UPDATE asignacion SET nota = ?, estado = ? WHERE asignacion_id = ?',
      [notaNum, estadoFinal, entregas[0].asignacion_id]
    );

    res.json({ mensaje: 'Nota guardada', nota: notaNum, estado: estadoFinal });
  } catch (err) {
    console.error('Error al guardar nota:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
