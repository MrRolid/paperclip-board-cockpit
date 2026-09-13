import http from "node:http";
import https from "node:https";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

export const LLM_REDIRECT_ERROR = "LLM endpoint returned a redirect; redirects are not followed";

export type LlmAddressKind = "private" | "linklocal" | "public";

export type ApprovedLlmAddress = {
  address: string;
  family: 4 | 6;
};

export type LlmHttpResponseLike = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
};

export type LlmHttpFetcher = (input: string, init?: RequestInit) => Promise<LlmHttpResponseLike>;

export type LlmLookup = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<Array<{ address: string; family: number }>>;

function normalizedHost(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, "").replace(/%.+$/, "").toLowerCase();
}

function ipv4Octets(address: string): number[] | null {
  if (isIP(address) !== 4) return null;
  const octets = address.split(".").map(Number);
  return octets.length === 4 && octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    ? octets
    : null;
}

export function addressKind(address: string): LlmAddressKind {
  const normalized = normalizedHost(address);
  const v4 = ipv4Octets(normalized);
  if (v4) {
    const [a, b] = v4;
    if (a === 169 && b === 254) return "linklocal";
    if (a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31)) return "private";
    if (a === 100 && b >= 64 && b <= 127) return "private";
    return "public";
  }

  if (isIP(normalized) === 6) {
    if (normalized === "::1") return "private";
    const firstPart = normalized.split(":", 1)[0] || "0";
    const firstHextet = Number.parseInt(firstPart, 16);
    if (Number.isFinite(firstHextet)) {
      if ((firstHextet & 0xffc0) === 0xfe80) return "linklocal"; // fe80::/10
      if ((firstHextet & 0xfe00) === 0xfc00) return "private"; // fc00::/7 (ULA)
    }
  }

  return "public";
}

export function validateLlmBaseUrl(baseUrl: string): URL {
  let url: URL;
  try {
    url = new URL(baseUrl.trim());
  } catch {
    throw new Error("Local LLM base URL is invalid");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Local LLM URL must use http or https");
  if (url.username || url.password) throw new Error("Credentials must not be embedded in the local LLM URL");
  if (normalizedHost(url.hostname) === "169.254.169.254") throw new Error("Cloud metadata endpoints are not allowed");
  return url;
}

export function isObviouslyPrivateEndpoint(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    const host = normalizedHost(url.hostname);
    if (host === "localhost") return true;
    if (isIP(host) === 0) return false;
    return addressKind(host) !== "public";
  } catch {
    return false;
  }
}

export function isExplicitLanEndpoint(baseUrl: string): boolean {
  const url = validateLlmBaseUrl(baseUrl);
  const host = normalizedHost(url.hostname);
  if (host === "localhost") return true;
  if (isIP(host) === 0) return false;
  return addressKind(host) === "private";
}

export async function assertDirectLlmEndpointPolicy(
  baseUrl: string,
  allowPrivateNetwork: boolean,
  lookupFn: LlmLookup = dnsLookup as LlmLookup,
): Promise<ApprovedLlmAddress[]> {
  const url = validateLlmBaseUrl(baseUrl);
  const host = normalizedHost(url.hostname);
  const resolved = await lookupFn(host, { all: true, verbatim: true }).catch((error) => {
    throw new Error(`Cannot resolve local LLM host: ${String(error)}`);
  });
  if (resolved.length === 0) throw new Error("Local LLM host resolved to no addresses");

  const approved: ApprovedLlmAddress[] = [];
  const seen = new Set<string>();
  for (const item of resolved) {
    if (item.family !== 4 && item.family !== 6) continue;
    const kind = addressKind(item.address);
    if (kind === "linklocal") throw new Error("Link-local/cloud-metadata style LLM destinations are not allowed");
    if (kind === "private" && !allowPrivateNetwork) {
      throw new Error("Local LLM resolves to a private address. Enable the explicit private/LAN endpoint option if this is intentional.");
    }
    const key = `${item.family}:${item.address}`;
    if (!seen.has(key)) {
      seen.add(key);
      approved.push({ address: item.address, family: item.family });
    }
  }

  if (approved.length === 0) throw new Error("Local LLM host resolved to no usable IPv4/IPv6 addresses");
  return approved;
}

function sameOrigin(a: URL, b: URL): boolean {
  return a.protocol === b.protocol && normalizedHost(a.hostname) === normalizedHost(b.hostname) && a.port === b.port;
}

function requestBody(body: BodyInit | null | undefined): Buffer | null {
  if (body == null) return null;
  if (typeof body === "string") return Buffer.from(body);
  if (body instanceof URLSearchParams) return Buffer.from(body.toString());
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  throw new Error("Unsupported direct LLM request body type");
}

export function createPinnedDirectLlmFetcher(baseUrl: string, approvedAddresses: ApprovedLlmAddress[]): LlmHttpFetcher {
  // This hardening release intentionally uses Node's native HTTP(S) agent instead
  // of adding another runtime HTTP dependency. The agent's custom lookup pins the
  // socket to policy-approved addresses while the original URL hostname remains in
  // place for Host, SNI, and certificate validation.
  const configuredUrl = validateLlmBaseUrl(baseUrl);
  const configuredHost = normalizedHost(configuredUrl.hostname);
  if (approvedAddresses.length === 0) throw new Error("No policy-approved LLM addresses are available");

  let cursor = 0;
  const pinnedLookup = (
    _hostname: string,
    options: number | { all?: boolean; family?: number },
    callback: (error: NodeJS.ErrnoException | null, address: string | Array<{ address: string; family: number }>, family?: number) => void,
  ) => {
    const requestedFamily = typeof options === "object" ? options.family : options;
    const candidates = approvedAddresses.filter((item) => !requestedFamily || requestedFamily === 0 || item.family === requestedFamily);
    const pool = candidates.length > 0 ? candidates : approvedAddresses;
    if (typeof options === "object" && options.all) {
      callback(null, pool.map((item) => ({ address: item.address, family: item.family })));
      return;
    }
    const selected = pool[cursor % pool.length];
    cursor += 1;
    callback(null, selected.address, selected.family);
  };

  const httpAgent = new http.Agent({ lookup: pinnedLookup as never });
  const httpsAgent = new https.Agent({ lookup: pinnedLookup as never });

  return async (input, init = {}) => {
    const requestUrl = new URL(input);
    if (!sameOrigin(requestUrl, configuredUrl)) throw new Error("Direct LLM request target does not match the configured endpoint origin");
    const body = requestBody(init.body);
    const headers: Record<string, string> = {};
    new Headers(init.headers).forEach((value, key) => {
      headers[key] = value;
    });
    if (body && headers["content-length"] === undefined) headers["content-length"] = String(body.byteLength);

    return await new Promise<LlmHttpResponseLike>((resolve, reject) => {
      const request = (requestUrl.protocol === "https:" ? https : http).request(
        requestUrl,
        {
          method: init.method ?? "GET",
          headers,
          signal: init.signal ?? undefined,
          agent: requestUrl.protocol === "https:" ? httpsAgent : httpAgent,
          // Keep certificate validation and SNI bound to the configured hostname,
          // while the custom lookup above pins the actual socket destination to the
          // exact addresses that passed the endpoint policy check.
          ...(requestUrl.protocol === "https:" && isIP(configuredHost) === 0 ? { servername: configuredHost } : {}),
        },
        (response) => {
          const status = response.statusCode ?? 0;
          if (status >= 300 && status < 400) {
            response.resume();
            reject(new Error(LLM_REDIRECT_ERROR));
            return;
          }

          const chunks: Buffer[] = [];
          response.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          response.on("error", reject);
          response.on("end", () => {
            const payload = Buffer.concat(chunks);
            const textValue = payload.toString("utf8");
            resolve({
              ok: status >= 200 && status < 300,
              status,
              text: async () => textValue,
              json: async () => JSON.parse(textValue),
            });
          });
        },
      );
      request.on("error", reject);
      if (body) request.write(body);
      request.end();
    });
  };
}
