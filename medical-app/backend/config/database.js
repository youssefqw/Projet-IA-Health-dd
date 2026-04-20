const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'medical_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Tester la connexion
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Erreur de connexion à MySQL:', err.message);
    } else {
        console.log('✅ Connecté à MySQL avec succès');
        connection.release();
    }
});

module.exports = pool.promise();