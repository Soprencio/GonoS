const { Router } = require('express');
const { callSp } = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');

const router = Router();

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function generateCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

async function generateUniqueCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    const rows = await callSp('sp_verificar_codigo_clase', [code]);
    if (rows.length === 0) return code;
  }
  throw new Error('No se pudo generar un código único');
}

// GET /api/clases — listar clases del usuario autenticado
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await callSp('sp_listar_clases_usuario', [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error('Error al listar clases:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/clases — crear clase (cualquier usuario)
router.post('/', requireAuth, async (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre de la clase es obligatorio' });
  }

  let codigo;
  try {
    codigo = await generateUniqueCode();
  } catch (err) {
    return res.status(500).json({ error: 'Error generando código de invitación' });
  }

  const nombreSaneado = sanitizeText(nombre.trim());
  const descSaneado = descripcion ? sanitizeText(descripcion.trim()) : null;

  try {
    const result = await callSp('sp_crear_clase', [req.user.id, nombreSaneado, descSaneado, codigo]);
    const nuevaClaseId = result[0].clase_id;

    res.status(201).json({
      clase_id: nuevaClaseId,
      nombre: nombreSaneado,
      descripcion: descSaneado,
      codigo,
      rol: 'Creador'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      try {
        codigo = await generateUniqueCode();
        const retryResult = await callSp('sp_crear_clase', [req.user.id, nombreSaneado, descSaneado, codigo]);
        return res.status(201).json({
          clase_id: retryResult[0].clase_id,
          nombre: nombreSaneado,
          descripcion: descSaneado,
          codigo,
          rol: 'Creador'
        });
      } catch (retryErr) {
        console.error('Error al crear clase (reintento):', retryErr);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
    console.error('Error al crear clase:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/clases/codigo/:codigo — buscar clase por código (para unirse)
router.get('/codigo/:codigo', requireAuth, async (req, res) => {
  try {
    const rows = await callSp('sp_verificar_codigo_clase', [req.params.codigo.toUpperCase().trim()]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Código de invitación inválido' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al buscar código:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/clases/:claseId/participantes — listar participantes agrupados por rol
router.get('/:claseId/participantes', requireAuth, async (req, res) => {
  try {
    const miPart = await callSp('sp_obtener_participacion', [req.user.id, req.params.claseId]);
    if (miPart.length === 0) {
      return res.status(403).json({ error: 'No tenés acceso a esta clase' });
    }

    const rows = await callSp('sp_listar_participantes_clase', [req.params.claseId]);

    const creador = rows.filter(r => r.rol === 'Creador');
    const profesores = rows.filter(r => r.rol === 'Profesor');
    const alumnos = rows.filter(r => r.rol === 'Alumno');

    res.json({
      miRol: miPart[0].rol,
      creador: creador.map(r => ({ participacion_id: r.participacion_id, usuario_id: r.usuario_id, nombre: r.nombre, apellido: r.apellido, mail: r.mail, fecha_ingreso: r.fecha_ingreso })),
      profesores: profesores.map(r => ({ participacion_id: r.participacion_id, usuario_id: r.usuario_id, nombre: r.nombre, apellido: r.apellido, mail: r.mail, fecha_ingreso: r.fecha_ingreso })),
      alumnos: alumnos.map(r => ({ participacion_id: r.participacion_id, usuario_id: r.usuario_id, nombre: r.nombre, apellido: r.apellido, mail: r.mail, fecha_ingreso: r.fecha_ingreso }))
    });
  } catch (err) {
    console.error('Error al listar participantes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/clases/:claseId/participantes/:participacionId — sacar participante
router.delete('/:claseId/participantes/:participacionId', requireAuth, async (req, res) => {
  try {
    const miPart = await callSp('sp_obtener_participacion', [req.user.id, req.params.claseId]);
    if (miPart.length === 0) {
      return res.status(403).json({ error: 'No tenés acceso a esta clase' });
    }

    const miRol = miPart[0].rol;

    const targetPart = await callSp('sp_obtener_participante_por_id', [req.params.participacionId, req.params.claseId]);
    if (targetPart.length === 0) {
      return res.status(404).json({ error: 'Participante no encontrado' });
    }

    const targetRol = targetPart[0].rol;

    if (miRol !== 'Creador') {
      if (miRol === 'Profesor' && targetRol !== 'Alumno') {
        return res.status(403).json({ error: 'Solo podés sacar alumnos' });
      }
      if (miRol === 'Alumno') {
        return res.status(403).json({ error: 'No tenés permiso para sacar participantes' });
      }
    }

    await callSp('sp_eliminar_participante', [req.params.participacionId]);
    res.json({ mensaje: 'Participante eliminado' });
  } catch (err) {
    console.error('Error al eliminar participante:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/clases/:id — detalle de una clase
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const participaciones = await callSp('sp_obtener_participacion', [req.user.id, req.params.id]);

    if (participaciones.length === 0) {
      return res.status(403).json({ error: 'No tenés acceso a esta clase' });
    }

    const clases = await callSp('sp_obtener_clase_detalle', [req.params.id, participaciones[0].rol_id]);

    if (clases.length === 0) {
      return res.status(404).json({ error: 'Clase no encontrada' });
    }

    const trabajos = await callSp('sp_listar_trabajos_resumen_clase', [req.params.id]);

    res.json({ ...clases[0], rol: participaciones[0].rol, trabajos });
  } catch (err) {
    console.error('Error al obtener clase:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/clases/:id/unirse — unirse a una clase con código
router.post('/:id/unirse', requireAuth, async (req, res) => {
  const { codigo } = req.body;
  if (!codigo) {
    return res.status(400).json({ error: 'El código de invitación es obligatorio' });
  }

  try {
    const clases = await callSp('sp_verificar_codigo_clase', [codigo.toUpperCase().trim()]);

    if (clases.length === 0 || clases[0].clase_id !== parseInt(req.params.id, 10)) {
      return res.status(400).json({ error: 'Código de invitación inválido' });
    }

    const existentes = await callSp('sp_obtener_participacion', [req.user.id, req.params.id]);

    if (existentes.length > 0) {
      return res.status(409).json({ error: 'Ya estás participando en esta clase' });
    }

    await callSp('sp_unirse_clase', [req.user.id, req.params.id]);

    res.status(201).json({ mensaje: 'Te uniste a la clase', clase: clases[0].nombre });
  } catch (err) {
    console.error('Error al unirse a clase:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
