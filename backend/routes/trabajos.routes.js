const { Router } = require('express');
const { callSp } = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');

const router = Router();

// ── Helpers ──
async function getParticipacion(usuarioId, claseId) {
  const rows = await callSp('sp_obtener_participacion', [usuarioId, claseId]);
  return rows[0] || null;
}

// GET /api/clases/:claseId/alumnos — listar alumnos de una clase (solo Profesor/Creador)
router.get('/clases/:claseId/alumnos', requireAuth, async (req, res) => {
  const participacion = await getParticipacion(req.user.id, req.params.claseId);
  if (!participacion || (participacion.rol !== 'Profesor' && participacion.rol !== 'Creador')) {
    return res.status(403).json({ error: 'Solo el profesor puede ver los alumnos' });
  }

  try {
    const alumnos = await callSp('sp_listar_alumnos_clase', [req.params.claseId]);
    res.json(alumnos);
  } catch (err) {
    console.error('Error al listar alumnos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/clases/:claseId/trabajos — crear trabajo (solo Profesor)
router.post('/clases/:claseId/trabajos', requireAuth, async (req, res) => {
  const participacion = await getParticipacion(req.user.id, req.params.claseId);
  if (!participacion || (participacion.rol !== 'Profesor' && participacion.rol !== 'Creador')) {
    return res.status(403).json({ error: 'Solo el profesor puede crear trabajos en esta clase' });
  }

  const { descripcion, fecha_entrega, formatos_aceptados, alumnos_ids, nota_minima } = req.body;

  const notaMinima = nota_minima === undefined || nota_minima === null ? 6 : parseFloat(nota_minima);
  if (isNaN(notaMinima) || notaMinima < 1 || notaMinima > 10) {
    return res.status(400).json({ error: 'La nota mínima de aprobación debe estar entre 1 y 10' });
  }

  if (!descripcion || !descripcion.trim()) {
    return res.status(400).json({ error: 'La descripción del trabajo es obligatoria' });
  }
  if (descripcion.length > 5000) {
    return res.status(400).json({ error: 'La descripción no puede superar los 5000 caracteres' });
  }
  if (!fecha_entrega) {
    return res.status(400).json({ error: 'La fecha de entrega es obligatoria' });
  }
  const fecha = new Date(fecha_entrega);
  if (isNaN(fecha.getTime())) {
    return res.status(400).json({ error: 'Formato de fecha inválido' });
  }
  if (fecha <= new Date()) {
    return res.status(400).json({ error: 'La fecha de entrega debe ser una fecha y hora futura' });
  }
  if (!Array.isArray(formatos_aceptados) || formatos_aceptados.length === 0) {
    return res.status(400).json({ error: 'Debe especificar al menos un formato aceptado' });
  }
  if (!Array.isArray(alumnos_ids) || alumnos_ids.length === 0) {
    return res.status(400).json({ error: 'Debe seleccionar al menos un alumno' });
  }

  try {
    const descSaneada = sanitizeText(descripcion.trim());

    const tpResult = await callSp('sp_crear_trabajo', [
      req.params.claseId,
      participacion.participacion_id,
      descSaneada,
      fecha,
      JSON.stringify(formatos_aceptados),
      notaMinima
    ]);

    const nuevoTpId = tpResult[0].tp_id;

    for (const participacionId of alumnos_ids) {
      await callSp('sp_crear_asignacion', [nuevoTpId, participacionId]);
    }

    res.status(201).json({
      tp_id: nuevoTpId,
      clase_id: parseInt(req.params.claseId, 10),
      descripcion: descSaneada,
      fecha_entrega: fecha,
      formatos_aceptados,
      nota_minima: notaMinima,
      alumnos_asignados: alumnos_ids.length
    });
  } catch (err) {
    console.error('Error al crear trabajo:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── COMENTARIOS PÚBLICOS ──

// GET /api/trabajos/:trabajoId/comentarios-publicos — listar comentarios (más viejo primero)
router.get('/trabajos/:trabajoId/comentarios-publicos', requireAuth, async (req, res) => {
  try {
    const tps = await callSp('sp_obtener_trabajo_simple', [req.params.trabajoId]);
    if (tps.length === 0) {
      return res.status(404).json({ error: 'Trabajo no encontrado' });
    }

    const participacion = await getParticipacion(req.user.id, tps[0].clase_id);
    if (!participacion) {
      return res.status(403).json({ error: 'No tenés acceso a este trabajo' });
    }

    const rows = await callSp('sp_listar_comentarios_publicos', [req.params.trabajoId]);

    res.json(rows.map(r => ({
      id: r.comentario_publico_id,
      mensaje: r.mensaje,
      created_at: r.created_at,
      autor: `${r.nombre} ${r.apellido}`,
      esProfesor: r.rol === 'Profesor' || r.rol === 'Creador'
    })));
  } catch (err) {
    console.error('Error al listar comentarios públicos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/trabajos/:trabajoId/comentarios-publicos — crear comentario (cualquier participante)
router.post('/trabajos/:trabajoId/comentarios-publicos', requireAuth, async (req, res) => {
  const { mensaje } = req.body;

  if (!mensaje || typeof mensaje !== 'string' || !mensaje.trim()) {
    return res.status(400).json({ error: 'El mensaje es obligatorio' });
  }

  const mensajeSaneado = sanitizeText(mensaje.trim());
  if (mensajeSaneado.length > 5000) {
    return res.status(400).json({ error: 'El mensaje no puede superar los 5000 caracteres' });
  }

  try {
    const tps = await callSp('sp_obtener_trabajo_simple', [req.params.trabajoId]);
    if (tps.length === 0) {
      return res.status(404).json({ error: 'Trabajo no encontrado' });
    }

    const participacion = await getParticipacion(req.user.id, tps[0].clase_id);
    if (!participacion) {
      return res.status(403).json({ error: 'No tenés acceso a este trabajo' });
    }

    const rows = await callSp('sp_crear_comentario_publico', [
      req.params.trabajoId,
      participacion.participacion_id,
      mensajeSaneado
    ]);

    const pub = rows[0];
    res.status(201).json({
      id: pub.comentario_publico_id,
      mensaje: pub.mensaje,
      created_at: pub.created_at,
      autor: `${pub.nombre} ${pub.apellido}`,
      esProfesor: pub.rol === 'Profesor' || pub.rol === 'Creador'
    });
  } catch (err) {
    console.error('Error al crear comentario público:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/clases/:claseId/trabajos — listar trabajos de una clase
router.get('/clases/:claseId/trabajos', requireAuth, async (req, res) => {
  const participacion = await getParticipacion(req.user.id, req.params.claseId);
  if (!participacion) {
    return res.status(403).json({ error: 'No tenés acceso a esta clase' });
  }

  try {
    if (participacion.rol === 'Profesor' || participacion.rol === 'Creador') {
      const trabajos = await callSp('sp_listar_trabajos_docente', [req.params.claseId]);
      res.json(trabajos.map(t => ({
        ...t,
        formatos_aceptados: typeof t.formatos_aceptados === 'string' ? JSON.parse(t.formatos_aceptados) : t.formatos_aceptados,
        puedeCalificar: participacion.rol === 'Creador' || t.participacion_id === participacion.participacion_id
      })));
    } else {
      const trabajos = await callSp('sp_listar_trabajos_alumno', [req.params.claseId, participacion.participacion_id]);
      res.json(trabajos.map(t => ({
        ...t,
        formatos_aceptados: typeof t.formatos_aceptados === 'string' ? JSON.parse(t.formatos_aceptados) : t.formatos_aceptados
      })));
    }
  } catch (err) {
    console.error('Error al listar trabajos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/trabajos/:id — detalle de un trabajo
router.get('/trabajos/:id', requireAuth, async (req, res) => {
  try {
    const tps = await callSp('sp_obtener_trabajo_detalle', [req.params.id]);

    if (tps.length === 0) {
      return res.status(404).json({ error: 'Trabajo no encontrado' });
    }

    const tp = tps[0];
    const participacion = await getParticipacion(req.user.id, tp.clase_id);
    if (!participacion) {
      return res.status(403).json({ error: 'No tenés acceso a este trabajo' });
    }

    const puedeCalificar =
      participacion.rol === 'Creador' ||
      (participacion.rol === 'Profesor' && tp.participacion_id === participacion.participacion_id);

    const result = {
      tp_id: tp.tp_id,
      clase_id: tp.clase_id,
      clase_nombre: tp.clase_nombre,
      descripcion: tp.descripcion,
      fecha_entrega: tp.fecha_entrega,
      formatos_aceptados: typeof tp.formatos_aceptados === 'string' ? JSON.parse(tp.formatos_aceptados) : tp.formatos_aceptados,
      created_at: tp.created_at,
      rol: participacion.rol,
      puedeCalificar
    };

    if (participacion.rol === 'Alumno') {
      const asig = await callSp('sp_obtener_asignacion_alumno', [req.params.id, participacion.participacion_id]);
      result.asignacion = asig[0] || null;
    }

    res.json(result);
  } catch (err) {
    console.error('Error al obtener trabajo:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/usuarios/:usuarioId/trabajos — trabajos de un alumno en una clase (solo Profesor/Creador)
router.get('/usuarios/:usuarioId/trabajos', requireAuth, async (req, res) => {
  const { clase_id } = req.query;
  if (!clase_id) {
    return res.status(400).json({ error: 'Falta el parámetro clase_id' });
  }

  try {
    const miPart = await callSp('sp_obtener_participacion', [req.user.id, clase_id]);
    if (!miPart.length || (miPart[0].rol !== 'Profesor' && miPart[0].rol !== 'Creador')) {
      return res.status(403).json({ error: 'No tenés permiso para ver esta información' });
    }

    const alumnoPart = await callSp('sp_obtener_participacion', [req.params.usuarioId, clase_id]);
    if (!alumnoPart.length) {
      return res.status(404).json({ error: 'El alumno no pertenece a esta clase' });
    }

    const rows = await callSp('sp_listar_trabajos_alumno_perfil', [clase_id, alumnoPart[0].participacion_id]);

    res.json(rows.map(r => ({
      tp_id: r.tp_id,
      descripcion: r.descripcion,
      fecha_entrega: r.fecha_entrega,
      nota_minima: r.nota_minima,
      nota: r.nota,
      estado: r.estado,
      tieneEntrega: !!r.entrega_id
    })));
  } catch (err) {
    console.error('Error al obtener trabajos del alumno:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
