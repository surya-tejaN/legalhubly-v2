/** Structured JSON logs for edge functions (request_id, latency, status). */

export function newRequestId(): string {
  return crypto.randomUUID();
}

export function logInfo(
  fields: Record<string, unknown>,
): void {
  console.log(JSON.stringify({ level: "info", ts: new Date().toISOString(), ...fields }));
}

export function logError(
  fields: Record<string, unknown>,
): void {
  console.error(JSON.stringify({ level: "error", ts: new Date().toISOString(), ...fields }));
}
