// Separate application processes communicate only through private stdin/stdout
// pipes. Neither credentials nor keys are command-line arguments or log output.
import { Pool } from "pg";
import { EncryptedAuthRecord } from "../../lib/auth/encrypted-record.server";
import { PostgresAuthRecords, postgresAuthStores } from "../../lib/auth/postgres-stores.server";
import { SessionService } from "../../lib/auth/session.server";

async function main() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  const request = JSON.parse(input);
  const pool = new Pool(request.database);
  try {
    const codec = new EncryptedAuthRecord("test", new Map([["test", Buffer.from(request.key, "base64")]]));
    const stores = postgresAuthStores(new PostgresAuthRecords(pool, codec));
    const service = new SessionService(stores.sessions, { async revoke() {} });
    if (request.action === "create") {
      const result = await service.create({ identity: { subject: "restart-customer", emailVerified: true, customerAccess: true }, expiresAt: Date.now() + 60000 });
      process.stdout.write(JSON.stringify({ id: result.cookie.split(";")[0].split("=")[1] }));
    } else if (request.action === "read") {
      const session = await service.read(request.id);
      process.stdout.write(JSON.stringify({ restored: session?.identity.subject === "restart-customer" }));
    } else throw new Error();
  } catch {
    process.stderr.write("Isolated persistence worker failed");
    process.exitCode = 1;
  } finally { await pool.end(); }
}
main().catch(() => {
  process.stderr.write("Isolated persistence worker failed");
  process.exitCode = 1;
});
