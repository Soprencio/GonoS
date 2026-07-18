const { Router } = require('express');
const pool = require('../database/connection');
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
    const [rows] = await pool.execute('SELECT clase_id FROM clases WHERE codigo = ?', [code]);
    if (rows.length === 0) return code;
  }
  throw new Error('No se pudo generar un código único');
}

// GET /api/clases — listar clases del usuario autenticado
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT c.clase_id, c.nombre, c.descripcion, c.codigo, c.created_at,
              r.nombre AS rol,
              (SELECT COUNT(*) FROM trabajos WHERE clase_id = c.clase_id) AS cantidad_trabajos
       FROM clases c
       JOIN participaciones p ON c.clase_id = p.clase_id
       JOIN roles r ON p.rol_id = r.rol_id
       WHERE p.usuario_id = ?
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
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

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const nombreSaneado = sanitizeText(nombre.trim());
    const descSaneado = descripcion ? sanitizeText(descripcion.trim()) : null;

    const [claseResult] = await conn.execute(
      'INSERT INTO clases (nombre, descripcion, codigo) VALUES (?, ?, ?)',
      [nombreSaneado, descSaneado, codigo]
    );

      await conn.execute(
        'INSERT INTO participaciones (usuario_id, clase_id, rol_id) VALUES (?, ?, 1)',
        [req.user.id, claseResult.insertId]
      );

      await conn.commit();

      res.status(201).json({
        clase_id: claseResult.insertId,
        nombre: nombreSaneado,
        descripcion: descSaneado,
        codigo,
        rol: 'Creador'
      });
  } catch (err) {
    await conn.rollback();
    // Si el error es por código duplicado (UNIQUE), reintentar
    if (err.code === 'ER_DUP_ENTRY') {
      try {
        codigo = await generateUniqueCode();
        const nombreSaneado = sanitizeText(nombre.trim());
        const descSaneado = descripcion ? sanitizeText(descripcion.trim()) : null;
        const [claseResult] = await conn.execute(
          'INSERT INTO clases (nombre, descripcion, codigo) VALUES (?, ?, ?)',
          [nombreSaneado, descSaneado, codigo]
        );
        await conn.execute(
          'INSERT INTO participaciones (usuario_id, clase_id, rol_id) VALUES (?, ?, 1)',
          [req.user.id, claseResult.insertId]
        );
        await conn.commit();
        return res.status(201).json({
          clase_id: claseResult.insertId,
          nombre: nombreSaneado,
          descripcion: descSaneado,
          codigo,
          rol: 'Creador'
        });
      } catch (retryErr) {
        await conn.rollback();
        console.error('Error al crear clase (reintento):', retryErr);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
    }
    console.error('Error al crear clase:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
});

// GET /api/clases/codigo/:codigo — buscar clase por código (para unirse)
router.get('/codigo/:codigo', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT clase_id, nombre FROM clases WHERE codigo = ?',
      [req.params.codigo.toUpperCase().trim()]
    );
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
    const [miPart] = await pool.execute(
      `SELECT r.nombre AS rol FROM participaciones p
       JOIN roles r ON p.rol_id = r.rol_id
       WHERE p.usuario_id = ? AND p.clase_id = ?`,
      [req.user.id, req.params.claseId]
    );
    if (miPart.length === 0) {
      return res.status(403).json({ error: 'No tenés acceso a esta clase' });
    }

    const [rows] = await pool.execute(
      `SELECT p.participacion_id, p.rol_id, r.nombre AS rol,
              u.usuario_id, u.nombre, u.apellido, u.mail
       FROM participaciones p
       JOIN usuarios u ON p.usuario_id = u.usuario_id
       JOIN roles r ON p.rol_id = r.rol_id
       WHERE p.clase_id = ?
       ORDER BY r.rol_id, u.apellido, u.nombre`,
      [req.params.claseId]
    );

    const creador = rows.filter(r => r.rol === 'Creador');
    const profesores = rows.filter(r => r.rol === 'Profesor');
    const alumnos = rows.filter(r => r.rol === 'Alumno');

    res.json({
      miRol: miPart[0].rol,
      creador: creador.map(r => ({ participacion_id: r.participacion_id, usuario_id: r.usuario_id, nombre: r.nombre, apellido: r.apellido, mail: r.mail })),
      profesores: profesores.map(r => ({ participacion_id: r.participacion_id, usuario_id: r.usuario_id, nombre: r.nombre, apellido: r.apellido, mail: r.mail })),
      alumnos: alumnos.map(r => ({ participacion_id: r.participacion_id, usuario_id: r.usuario_id, nombre: r.nombre, apellido: r.apellido, mail: r.mail }))
    });
  } catch (err) {
    console.error('Error al listar participantes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/clases/:claseId/participantes/:participacionId — sacar participante
router.delete('/:claseId/participantes/:participacionId', requireAuth, async (req, res) => {
  try {
    const [miPart] = await pool.execute(
      `SELECT r.nombre AS rol FROM participaciones p
       JOIN roles r ON p.rol_id = r.rol_id
       WHERE p.usuario_id = ? AND p.clase_id = ?`,
      [req.user.id, req.params.claseId]
    );
    if (miPart.length === 0) {
      return res.status(403).json({ error: 'No tenés acceso a esta clase' });
    }

    const miRol = miPart[0].rol;

    const [targetPart] = await pool.execute(
      `SELECT r.nombre AS rol FROM participaciones p
       JOIN roles r ON p.rol_id = r.rol_id
       WHERE p.participacion_id = ? AND p.clase_id = ?`,
      [req.params.participacionId, req.params.claseId]
    );
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

    await pool.execute('DELETE FROM participaciones WHERE participacion_id = ?', [req.params.participacionId]);
    res.json({ mensaje: 'Participante eliminado' });
  } catch (err) {
    console.error('Error al eliminar participante:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/clases/:id — detalle de una clase
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [participaciones] = await pool.execute(
      `SELECT p.participacion_id, p.rol_id, r.nombre AS rol
       FROM participaciones p
       JOIN roles r ON p.rol_id = r.rol_id
       WHERE p.usuario_id = ? AND p.clase_id = ?`,
      [req.user.id, req.params.id]
    );

    if (participaciones.length === 0) {
      return res.status(403).json({ error: 'No tenés acceso a esta clase' });
    }

    const [clases] = await pool.execute(
      `SELECT c.clase_id, c.nombre, c.descripcion,
              CASE WHEN ? IN (1, 2) THEN c.codigo ELSE NULL END AS codigo,
              c.created_at,
              (SELECT COUNT(*) FROM trabajos WHERE clase_id = c.clase_id) AS cantidad_trabajos
       FROM clases c
       WHERE c.clase_id = ?`,
      [participaciones[0].rol_id, req.params.id]
    );

    if (clases.length === 0) {
      return res.status(404).json({ error: 'Clase no encontrada' });
    }

    const [trabajos] = await pool.execute(
      'SELECT tp_id, descripcion, fecha_entrega, formatos_aceptados, created_at FROM trabajos WHERE clase_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

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
    const [clases] = await pool.execute(
      'SELECT clase_id, nombre, codigo FROM clases WHERE clase_id = ?',
      [req.params.id]
    );

    if (clases.length === 0) {
      return res.status(400).json({ error: 'Código de invitación inválido' });
    }

    if (clases[0].codigo !== codigo.toUpperCase().trim()) {
      return res.status(400).json({ error: 'Código de invitación inválido' });
    }

    const [existentes] = await pool.execute(
      'SELECT participacion_id FROM participaciones WHERE usuario_id = ? AND clase_id = ?',
      [req.user.id, req.params.id]
    );

    if (existentes.length > 0) {
      return res.status(409).json({ error: 'Ya estás participando en esta clase' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [partResult] = await conn.execute(
        'INSERT INTO participaciones (usuario_id, clase_id, rol_id) VALUES (?, ?, 3)',
        [req.user.id, req.params.id]
      );

      // Generar asignaciones pendientes para trabajos ya existentes
      const [trabajos] = await conn.execute(
        'SELECT tp_id FROM trabajos WHERE clase_id = ?',
        [req.params.id]
      );
      for (const t of trabajos) {
        await conn.execute(
          'INSERT INTO asignacion (tp_id, participacion_id) VALUES (?, ?)',
          [t.tp_id, partResult.insertId]
        );
      }

      await conn.commit();
      res.status(201).json({ mensaje: 'Te uniste a la clase', clase: clases[0].nombre });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Error al unirse a clase:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
