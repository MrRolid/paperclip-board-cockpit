import { afterEach, describe, expect, it } from "vitest";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import manifest from "../src/manifest.js";
import {
  LLM_REDIRECT_ERROR,
  addressKind,
  assertDirectLlmEndpointPolicy,
  createPinnedDirectLlmFetcher,
  isExplicitLanEndpoint,
  isObviouslyPrivateEndpoint,
} from "../src/llm-network.js";

const workerSource = fs.readFileSync(path.resolve("src/worker.ts"), "utf8");
const servers: http.Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) => new Promise<void>((resolve) => server.close(() => resolve())),
    ),
  );
});

async function startServer(handler: http.RequestListener): Promise<{ server: http.Server; port: number }> {
  const server = http.createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP port");
  return { server, port: address.port };
}

describe("Board Cockpit v0.9.3 direct LLM hardening", () => {
  it("keeps the release read-only and does not add capabilities", () => {
    expect(manifest.version).toBe("0.9.7");
    expect(manifest.capabilities).not.toContain("issues.update");
    expect(manifest.capabilities).not.toContain("agents.invoke");
    expect(manifest.capabilities).not.toContain("issue.relations.write");
  });

  it("treats carrier-grade NAT as private only inside 100.64.0.0/10", () => {
    expect(addressKind("100.64.0.1")).toBe("private");
    expect(addressKind("100.100.100.100")).toBe("private");
    expect(addressKind("100.127.255.255")).toBe("private");
    expect(addressKind("100.128.0.1")).toBe("public");
    expect(addressKind("100.63.255.255")).toBe("public");
    expect(isObviouslyPrivateEndpoint("http://100.100.100.100:8080/v1")).toBe(true);
    expect(isExplicitLanEndpoint("http://100.100.100.100:8080/v1")).toBe(true);
    expect(isObviouslyPrivateEndpoint("http://100.128.0.1:8080/v1")).toBe(false);
    expect(isExplicitLanEndpoint("http://100.128.0.1:8080/v1")).toBe(false);
  });


  it("requires the private-network opt-in for carrier-grade NAT DNS results", async () => {
    await expect(
      assertDirectLlmEndpointPolicy("http://llm.test:8080/v1", false, async () => [
        { address: "100.100.100.100", family: 4 },
      ]),
    ).rejects.toThrow("Local LLM resolves to a private address");
  });

  it("applies IPv6 private/link-local checks only to IP literals", () => {
    expect(isObviouslyPrivateEndpoint("http://fdserver.example.com:8080/v1")).toBe(false);
    expect(isExplicitLanEndpoint("http://fdserver.example.com:8080/v1")).toBe(false);
    expect(isObviouslyPrivateEndpoint("http://[fd12::1]:8080/v1")).toBe(true);
    expect(isExplicitLanEndpoint("http://[fd12::1]:8080/v1")).toBe(true);
    expect(addressKind("fe80::1")).toBe("linklocal");
  });

  it("rejects link-local DNS results before a direct client can be created", async () => {
    let lookupCalls = 0;
    await expect(
      assertDirectLlmEndpointPolicy("http://llm.test:8080/v1", true, async () => {
        lookupCalls += 1;
        return [{ address: "169.254.10.20", family: 4 }];
      }),
    ).rejects.toThrow("Link-local/cloud-metadata style LLM destinations are not allowed");
    expect(lookupCalls).toBe(1);
  });

  it("pins the connection to the address that passed policy while preserving the original Host", async () => {
    let seenHost = "";
    const { port } = await startServer((request, response) => {
      seenHost = request.headers.host ?? "";
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ data: [{ id: "test-model" }] }));
    });

    let lookupCalls = 0;
    const baseUrl = `http://llm.test:${port}/v1`;
    const approved = await assertDirectLlmEndpointPolicy(baseUrl, true, async () => {
      lookupCalls += 1;
      return [{ address: "127.0.0.1", family: 4 }];
    });
    const fetcher = createPinnedDirectLlmFetcher(baseUrl, approved);
    const response = await fetcher(`${baseUrl}/models`, { method: "GET", redirect: "error" });

    expect(response.ok).toBe(true);
    expect(lookupCalls).toBe(1);
    expect(seenHost).toBe(`llm.test:${port}`);
  });

  it("refuses redirects for both the model probe and completion POST", async () => {
    const { port } = await startServer((_request, response) => {
      response.writeHead(302, { location: "http://example.invalid/not-followed" });
      response.end("redirect");
    });
    const baseUrl = `http://llm.test:${port}/v1`;
    const fetcher = createPinnedDirectLlmFetcher(baseUrl, [{ address: "127.0.0.1", family: 4 }]);
    const expected = LLM_REDIRECT_ERROR;

    await expect(fetcher(`${baseUrl}/models`, { method: "GET", redirect: "error" })).rejects.toThrow(expected);
    await expect(
      fetcher(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
        redirect: "error",
      }),
    ).rejects.toThrow(expected);
  });

  it("routes direct analysis through the pinned client and requests redirect refusal", () => {
    expect(workerSource).toContain("const approvedAddresses = await assertDirectLlmEndpointPolicy");
    expect(workerSource).toContain("createPinnedDirectLlmFetcher(baseUrl, approvedAddresses)");
    expect((workerSource.match(/redirect: \"error\"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(workerSource).not.toContain("=> fetch(url, init)");
    expect(workerSource).not.toContain("=> fetch(input, init)");
  });
});
