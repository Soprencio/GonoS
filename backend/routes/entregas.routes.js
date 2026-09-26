const { Router } = require('express');
const path = require('path');
const { callSp } = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { upload, deleteFileIfExists, UPLOAD_DIR } = require('../middleware/upload');
const { normalizarNotaMinima, validarNota, calcularEstadoFinal } = require('../utils/notas');

const router = Router();

// ── Helpers ──

async function getParticipacion(usuarioId, claseId) {
  const rows = await callSp('sp_obtener_participacion', [usuarioId, claseId]);
  return rows[0] || null;
}

async function deleteOldExtras(entregaId) {
  const extras = await callSp('sp_listar_archivos_extra', [entregaId]);
  for (const ex of extras) {
    const p = path.join(UPLOAD_DIR, ex.nombre);
    await deleteFileIfExists(p);
  }
  await callSp('sp_eliminar_archivos_extra', [entregaId]);
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
      const asignaciones = await callSp('sp_obtener_asignacion_para_entrega', [req.params.asignacionId]);

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

      try {
        const existentes = await callSp('sp_obtener_ultima_entrega', [req.params.asignacionId]);

        if (existentes.length > 0) {
          const vieja = existentes[0];
          const viejoPath = path.join(UPLOAD_DIR, vieja.archivo);
          await deleteFileIfExists(viejoPath);
          await deleteOldExtras(vieja.entrega_id);
        }

        const saveResult = await callSp('sp_guardar_entrega', [
          req.params.asignacionId,
          pathRelativo,
          mainFile.originalname,
          esTardia ? 'Entrega tardía' : null
        ]);

        const entregaId = saveResult[0].entrega_id;

        for (const ef of extraFiles) {
          const relPath = ef.path.replace(/\\/g, '/').replace(/^.*?uploads\//, '');
          await callSp('sp_guardar_archivo_extra', [entregaId, relPath, ef.originalname]);
        }

        res.status(201).json({
          mensaje: existentes.length > 0 ? 'Entrega actualizada correctamente' : 'Trabajo entregado correctamente',
          tardia: esTardia
        });
      } catch (err) {
        await deleteFileIfExists(mainFile.path);
        for (const ef of extraFiles) await deleteFileIfExists(ef.path);
        throw err;
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
    const tps = await callSp('sp_obtener_trabajo_simple', [req.params.trabajoId]);

    if (tps.length === 0) {
      return res.status(404).json({ error: 'Trabajo no encontrado' });
    }

    const participacion = await getParticipacion(req.user.id, tps[0].clase_id);
    if (!participacion || (participacion.rol !== 'Profesor' && participacion.rol !== 'Creador')) {
      return res.status(403).json({ error: 'Solo el profesor puede ver las entregas de este trabajo' });
    }

    const entregas = await callSp('sp_listar_entregas_trabajo', [req.params.trabajoId]);
    res.json(entregas);
  } catch (err) {
    console.error('Error al listar entregas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /api/entregas/:id — detalle de una entrega
router.get('/entregas/:id', requireAuth, async (req, res) => {
  try {
    const entregas = await callSp('sp_obtener_entrega_detalle', [req.params.id]);

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

    // Determinar si el usuario puede calificar esta entrega
    let puedeCalificar = false;
    if (participacion.rol === 'Creador') {
      puedeCalificar = true;
    } else if (participacion.rol === 'Profesor') {
      const tps = await callSp('sp_obtener_trabajo_simple', [entrega.tp_id]);
      puedeCalificar = tps.length > 0 && tps[0].participacion_id === participacion.participacion_id;
    }

    const archivosExtra = await callSp('sp_listar_archivos_extra', [entrega.entrega_id]);

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
      nota_minima: entrega.nota_minima,
      rol: participacion.rol,
      puedeCalificar,
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
    const entregas = await callSp('sp_obtener_entrega_archivo', [req.params.id]);

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
    const entregas = await callSp('sp_obtener_entrega_archivo', [req.params.id]);

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

    const extras = await callSp('sp_obtener_archivo_extra', [req.params.id, req.params.archivoExtraId]);

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

  const validacion = validarNota(nota);
  if (!validacion.ok) {
    return res.status(400).json({ error: validacion.error });
  }

  const notaNum = validacion.valor;

  try {
    const entregas = await callSp('sp_obtener_entrega_detalle', [req.params.id]);

    if (entregas.length === 0) {
      return res.status(404).json({ error: 'Entrega no encontrada' });
    }

    const participacion = await getParticipacion(req.user.id, entregas[0].clase_id);
    if (!participacion || (participacion.rol !== 'Profesor' && participacion.rol !== 'Creador')) {
      return res.status(403).json({ error: 'Solo el profesor puede calificar' });
    }

    // Verificar que puede calificar este trabajo (solo si lo creó o es Creador de la clase)
    const tps = await callSp('sp_obtener_trabajo_simple', [entregas[0].tp_id]);
    if (tps.length > 0 && participacion.rol !== 'Creador' && tps[0].participacion_id !== participacion.participacion_id) {
      return res.status(403).json({ error: 'No podés calificar un trabajo que no creaste' });
    }

    const notaMinima = normalizarNotaMinima(entregas[0].nota_minima);
    const estadoFinal = calcularEstadoFinal(notaNum, notaMinima);

    try {
      await callSp('sp_actualizar_nota_entrega', [req.params.id, notaNum, estadoFinal]);
    } catch (dbErr) {
      if (dbErr.code === 'WARN_DATA_TRUNCATED' && estadoFinal === 'Desaprobado') {
        console.warn('[entregas.routes] La columna "estado" en la base de datos no admite "Desaprobado". Se guardó temporalmente como "Revisado". Aplique backend/database/migracion-estado-desaprobado.sql.');
        await callSp('sp_actualizar_nota_entrega', [req.params.id, notaNum, 'Revisado']);
      } else {
        throw dbErr;
      }
    }

    res.json({ mensaje: 'Nota guardada', nota: notaNum, nota_minima: notaMinima, estado: estadoFinal });
  } catch (err) {
    console.error('Error al guardar nota:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
