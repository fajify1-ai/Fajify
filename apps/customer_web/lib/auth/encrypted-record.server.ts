import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** Keys come from server secret management. Keep retired keys while records
 * encrypted with them remain valid; new writes always use the active key. */
export class EncryptedAuthRecord {
  private readonly keys: ReadonlyMap<string, Buffer>;
  constructor(private readonly activeKeyId: string, keys: ReadonlyMap<string, Uint8Array>) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(activeKeyId) || !keys.has(activeKeyId) ||
        [...keys].some(([id, key]) => !/^[a-zA-Z0-9_-]{1,64}$/.test(id) || key.length !== 32)) {
      throw new Error("Invalid authentication encryption configuration");
    }
    this.keys = new Map([...keys].map(([id, key]) => [id, Buffer.from(key)]));
  }

  seal(value: unknown, context: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.keys.get(this.activeKeyId)!, iv);
    cipher.setAAD(Buffer.from(JSON.stringify([1, this.activeKeyId, context])));
    const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
    return ["1", this.activeKeyId, iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
  }

  open(value: string, context: string): unknown {
    try {
      const parts = value.split(".");
      const [version, id, iv, tag, body] = parts;
      const key = this.keys.get(id);
      if (parts.length !== 5 || version !== "1" || !key ||
          ![iv, tag, body].every(part => /^[A-Za-z0-9_-]+$/.test(part)) ||
          Buffer.from(iv, "base64url").length !== 12 || Buffer.from(tag, "base64url").length !== 16) throw 0;
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
      decipher.setAAD(Buffer.from(JSON.stringify([1, id, context])));
      decipher.setAuthTag(Buffer.from(tag, "base64url"));
      return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8"));
    } catch { throw new Error("Invalid encrypted authentication record"); }
  }
}
