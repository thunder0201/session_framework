const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres', //  nom d'utilisateur PostgreSQL
    host: 'localhost',
    database: 'categories_produits_db', // Le nom de la base
    password: 'admin', //  mot de passe PostgreSQL
    port: 5432,
});

module.exports = pool;
