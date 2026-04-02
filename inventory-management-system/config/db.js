const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Pass@123',
    database: 'inventory_management',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection
pool.getConnection()
    .then(conn => {
        console.log('✅ MySQL Database connected successfully');
        conn.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
    });

module.exports = pool;
