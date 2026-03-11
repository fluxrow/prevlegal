const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const client = new Client({
        connectionString: 'postgresql://postgres:PrevLegal2026!Axd@db.lrqvvxmgimjlghpwavdb.supabase.co:5432/postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const sqlFilePath = path.join(__dirname, '..', 'supabase', 'migrations', '012_rpc_increment_respondidos.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf8');
        await client.query(sql);
        console.log('✅ Migration 012 executada com sucesso!');
    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await client.end();
    }
}

runMigration();
