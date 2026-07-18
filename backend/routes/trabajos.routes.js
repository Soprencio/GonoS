const { Router } = require('express');
const pool = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');

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

// GET /api/clases/:claseId/alumnos — listar alumnos de una clase (solo Profesor/Creador)
router.get('/clases/:claseId/alumnos', requireAuth, async (req, res) => {
  const participacion = await getParticipacion(req.user.id, req.params.claseId);
  if (!participacion || (participacion.rol !== 'Profesor' && participacion.rol !== 'Creador')) {
    return res.status(403).json({ error: 'Solo el profesor puede ver los alumnos' });
  }

  try {
    const [alumnos] = await pool.execute(
      `SELECT p.participacion_id, u.usuario_id, u.nombre, u.apellido, u.mail
       FROM participaciones p
       JOIN usuarios u ON p.usuario_id = u.usuario_id
       JOIN roles r ON p.rol_id = r.rol_id
       WHERE p.clase_id = ? AND r.nombre = 'Alumno'
       ORDER BY u.apellido, u.nombre`,
      [req.params.claseId]
    );
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

  const { descripcion, fecha_entrega, formatos_aceptados, alumnos_ids } = req.body;

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

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const descSaneada = sanitizeText(descripcion.trim());

    const [tpResult] = await conn.execute(
      'INSERT INTO trabajos (clase_id, participacion_id, descripcion, fecha_entrega, formatos_aceptados) VALUES (?, ?, ?, ?, ?)',
      [req.params.claseId, participacion.participacion_id, descSaneada, fecha, JSON.stringify(formatos_aceptados)]
    );

    for (const participacionId of alumnos_ids) {
      await conn.execute(
        'INSERT INTO asignacion (tp_id, participacion_id) VALUES (?, ?)',
        [tpResult.insertId, participacionId]
      );
    }

    await conn.commit();

    res.status(201).json({
      tp_id: tpResult.insertId,
      clase_id: parseInt(req.params.claseId),
      descripcion: descSaneada,
      fecha_entrega: fecha,
      formatos_aceptados,
      alumnos_asignados: alumnos_ids.length
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error al crear trabajo:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
});

// ── COMENTARIOS PÚBLICOS ──

// GET /api/trabajos/:trabajoId/comentarios-publicos — listar comentarios (más viejo primero)
router.get('/trabajos/:trabajoId/comentarios-publicos', requireAuth, async (req, res) => {
  try {
    const [tps] = await pool.execute(
      'SELECT clase_id FROM trabajos WHERE tp_id = ?',
      [req.params.trabajoId]
    );
    if (tps.length === 0) {
      return res.status(404).json({ error: 'Trabajo no encontrado' });
    }

    const participacion = await getParticipacion(req.user.id, tps[0].clase_id);
    if (!participacion) {
      return res.status(403).json({ error: 'No tenés acceso a este trabajo' });
    }

    const [rows] = await pool.execute(
      `SELECT c.comentario_publico_id, c.mensaje, c.created_at,
              u.nombre, u.apellido, r.nombre AS rol
       FROM comentario_publico c
       JOIN participaciones p ON c.participacion_id = p.participacion_id
       JOIN usuarios u ON p.usuario_id = u.usuario_id
       JOIN roles r ON p.rol_id = r.rol_id
       WHERE c.tp_id = ?
       ORDER BY c.created_at ASC`,
      [req.params.trabajoId]
    );

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
    const [tps] = await pool.execute(
      'SELECT clase_id FROM trabajos WHERE tp_id = ?',
      [req.params.trabajoId]
    );
    if (tps.length === 0) {
      return res.status(404).json({ error: 'Trabajo no encontrado' });
    }

    const participacion = await getParticipacion(req.user.id, tps[0].clase_id);
    if (!participacion) {
      return res.status(403).json({ error: 'No tenés acceso a este trabajo' });
    }

    const [result] = await pool.execute(
      'INSERT INTO comentario_publico (tp_id, participacion_id, mensaje) VALUES (?, ?, ?)',
      [req.params.trabajoId, participacion.participacion_id, mensajeSaneado]
    );

    const [rows] = await pool.execute(
      `SELECT c.comentario_publico_id, c.mensaje, c.created_at,
              u.nombre, u.apellido, r.nombre AS rol
       FROM comentario_publico c
       JOIN participaciones p ON c.participacion_id = p.participacion_id
       JOIN usuarios u ON p.usuario_id = u.usuario_id
       JOIN roles r ON p.rol_id = r.rol_id
       WHERE c.comentario_publico_id = ?`,
      [result.insertId]
    );

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
      const [trabajos] = await pool.execute(
        `SELECT t.tp_id, t.descripcion, t.fecha_entrega, t.formatos_aceptados, t.created_at, t.participacion_id,
                (SELECT COUNT(*) FROM asignacion WHERE tp_id = t.tp_id) AS total_alumnos,
                (SELECT COUNT(*) FROM asignacion WHERE tp_id = t.tp_id AND estado = 'Pendiente') AS pendientes,
                (SELECT COUNT(*) FROM asignacion WHERE tp_id = t.tp_id AND estado = 'En revisión') AS en_revision,
                (SELECT COUNT(*) FROM asignacion WHERE tp_id = t.tp_id AND estado = 'Revisado') AS revisados,
                (SELECT COUNT(*) FROM asignacion WHERE tp_id = t.tp_id AND estado = 'Aprobado') AS aprobados
         FROM trabajos t
         WHERE t.clase_id = ?
         ORDER BY t.created_at DESC`,
        [req.params.claseId]
      );
      res.json(trabajos.map(t => ({
        ...t,
        formatos_aceptados: typeof t.formatos_aceptados === 'string' ? JSON.parse(t.formatos_aceptados) : t.formatos_aceptados,
        puedeCalificar: participacion.rol === 'Creador' || t.participacion_id === participacion.participacion_id
      })));
    } else {
      const [trabajos] = await pool.execute(
        `SELECT t.tp_id, t.descripcion, t.fecha_entrega, t.formatos_aceptados, t.created_at,
                a.estado, a.nota, a.asignacion_id
         FROM trabajos t
         JOIN asignacion a ON t.tp_id = a.tp_id
         WHERE t.clase_id = ? AND a.participacion_id = ?
         ORDER BY t.created_at DESC`,
        [req.params.claseId, participacion.participacion_id]
      );
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
    const [tps] = await pool.execute(
      `SELECT t.*, c.clase_id, c.nombre AS clase_nombre
       FROM trabajos t
       JOIN clases c ON t.clase_id = c.clase_id
       WHERE t.tp_id = ?`,
      [req.params.id]
    );

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
      const [asig] = await pool.execute(
        `SELECT a.asignacion_id, a.estado, a.nota,
                (SELECT e.entrega_id FROM entrega e WHERE e.asignacion_id = a.asignacion_id ORDER BY e.created_at DESC LIMIT 1) AS entrega_id
         FROM asignacion a
         WHERE a.tp_id = ? AND a.participacion_id = ?`,
        [req.params.id, participacion.participacion_id]
      );
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
    const [miPart] = await pool.execute(
      `SELECT r.nombre AS rol FROM participaciones p
       JOIN roles r ON p.rol_id = r.rol_id
       WHERE p.usuario_id = ? AND p.clase_id = ?`,
      [req.user.id, clase_id]
    );
    if (!miPart.length || (miPart[0].rol !== 'Profesor' && miPart[0].rol !== 'Creador')) {
      return res.status(403).json({ error: 'No tenés permiso para ver esta información' });
    }

    const [alumnoPart] = await pool.execute(
      'SELECT participacion_id FROM participaciones WHERE usuario_id = ? AND clase_id = ?',
      [req.params.usuarioId, clase_id]
    );
    if (!alumnoPart.length) {
      return res.status(404).json({ error: 'El alumno no pertenece a esta clase' });
    }

    const [rows] = await pool.execute(
      `SELECT t.tp_id, t.descripcion, t.fecha_entrega,
              a.asignacion_id, a.nota, a.estado,
              (SELECT e.entrega_id FROM entrega e WHERE e.asignacion_id = a.asignacion_id ORDER BY e.created_at DESC LIMIT 1) AS entrega_id
       FROM trabajos t
       JOIN asignacion a ON t.tp_id = a.tp_id
       WHERE t.clase_id = ? AND a.participacion_id = ?
       ORDER BY t.fecha_entrega ASC`,
      [clase_id, alumnoPart[0].participacion_id]
    );

    res.json(rows.map(r => ({
      tp_id: r.tp_id,
      descripcion: r.descripcion,
      fecha_entrega: r.fecha_entrega,
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
