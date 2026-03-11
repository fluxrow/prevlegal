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
        const sqlFilePath = path.join(__dirname, '..', 'supabase', 'migrations', '004_sync_users.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf8');
        await client.query(sql);
        console.log(`✅ Migration 004 executed successfully!`);
    } catch (err) {
        console.error(`❌ Error:`, err.message);
    } finally {
        await client.end();
    }
}

runMigration();
