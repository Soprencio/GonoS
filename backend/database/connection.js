const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10),
  connectionLimit: 10,
  charset: 'utf8mb4_general_ci',
});

pool.getConnection()
  .then(conn => {
    console.log('Conexión a MariaDB establecida correctamente');
    conn.release();
  })
  .catch(err => {
    console.error('Error al conectar con la base de datos:', err.message);
  });

/**
 * Ejecuta un Stored Procedure de MariaDB usando CALL sp_name(?, ...)
 * y desenvuelve automáticamente el primer conjunto de resultados (result set).
 *
 * @param {string} spName Nombre del procedimiento (ej: 'sp_obtener_participacion')
 * @param {Array} params Parámetros posicionales para el procedimiento
 * @returns {Promise<Array|Object>} Filas devueltas por el SP o información de ejecución
 */
async function callSp(spName, params = []) {
  const placeholders = params.map(() => '?').join(', ');
  const [result] = await pool.execute(`CALL ${spName}(${placeholders})`, params);
  if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
    return result[0];
  }
  return result;
}

pool.callSp = callSp;

module.exports = pool;
module.exports.callSp = callSp;
