const { Client } = require('pg');

async function checkUsers() {
    const client = new Client({
        connectionString: 'postgresql://postgres:PrevLegal2026!Axd@db.lrqvvxmgimjlghpwavdb.supabase.co:5432/postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        console.log("--- auth.users ---");
        const authRes = await client.query('SELECT id, email FROM auth.users');
        console.table(authRes.rows);

        console.log("\n--- public.usuarios ---");
        const pubRes = await client.query('SELECT id, auth_id, email, role FROM public.usuarios');
        console.table(pubRes.rows);
        
    } catch (err) {
        console.error(`❌ Error:`, err.message);
    } finally {
        await client.end();
    }
}

checkUsers();
