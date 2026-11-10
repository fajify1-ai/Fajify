const { Client } = require('pg');

async function main() {
  const password = process.env.KC_DB_PASSWORD;
  if (!password || password.length < 24) throw new Error('Missing generated database credential');
  const client = new Client({ connectionString: process.env.FAJI_DATABASE_URL });
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock(479102, 2)');
    const role = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'fajify_dev_keycloak'");
    const { rows: [statement] } = await client.query(
      "SELECT format('%s ROLE fajify_dev_keycloak LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L', $1::text, $2::text) AS sql",
      [role.rowCount ? 'ALTER' : 'CREATE', password],
    );
    await client.query(statement.sql);
    const db = await client.query("SELECT 1 FROM pg_database WHERE datname = 'fajify_dev_keycloak'");
    if (!db.rowCount) {
      await client.query('GRANT fajify_dev_keycloak TO CURRENT_USER WITH SET TRUE');
      await client.query('CREATE DATABASE fajify_dev_keycloak OWNER fajify_dev_keycloak');
    }
    await client.query('REVOKE CONNECT ON DATABASE fajify_dev_keycloak FROM PUBLIC');
    await client.query('REVOKE CONNECT ON DATABASE fajify_dev_postgres FROM PUBLIC');
    console.log('Keycloak database isolation configured');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Keycloak database setup failed', error.code ?? '');
  process.exitCode = 1;
});
