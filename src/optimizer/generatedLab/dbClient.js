// Browser side of the read-only Cirrus database API and the MiniZinc solve,
// served by cirrus-backend's /optimizer REST endpoints (optimizer.controller.ts;
// the cirrus-optimizer repo serves the same shapes from server/apiPlugin.js).
import { CIRRUS_API_BASE_URL } from "../../apollo";
import { getAuthToken } from "../../lib/auth-storage";

async function call(path, init = {}) {
  const token = getAuthToken();
  const headers = { ...init.headers, ...(token ? { authorization: `Bearer ${token}` } : {}) };
  let res;
  try { res = await fetch(`${CIRRUS_API_BASE_URL}/optimizer${path}`, { ...init, headers }); } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new Error(`Cirrus backend unreachable at ${CIRRUS_API_BASE_URL} (${e.message}).`);
  }
  const body = await res.json().catch(() => ({ error: `Unexpected ${res.status} response.` }));
  if (!res.ok) throw Object.assign(new Error(body.error ?? body.message ?? `Request failed (${res.status}).`), { diagnostics: body.diagnostics });
  return body;
}
const postJson = (body, signal) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
export const dbHealth = () => call("/health");
export const dbValidatedProtocols = () => call("/protocols");
export const dbLayouts = () => call("/layouts");
export const dbLayout = (layoutId, revision) => call(`/layouts/${encodeURIComponent(layoutId)}${revision !== undefined ? `?revision=${revision}` : ""}`);
export const dbProtocolData = (protocolIds, equipmentIds) => call("/protocol-data", postJson({ protocolIds, equipmentIds }));
export const optimizeOnServer = (input, scenario, signal) => call("/optimize", postJson({ input, scenario }, signal));
