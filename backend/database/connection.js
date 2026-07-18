const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10),
  connectionLimit: 10,
});

pool.getConnection()
  .then(conn => {
    console.log('Conexión a MariaDB establecida correctamente');
    conn.release();
  })
  .catch(err => {
    console.error('Error al conectar con la base de datos:', err.message);
  });

module.exports = pool;
