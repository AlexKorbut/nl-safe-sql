import { describe, it, expect } from "vitest";
import { indexabilityChecks } from "@/server/audit/checks/indexability";
import { makeContext } from "../fixtures/context";

const byId = Object.fromEntries(indexabilityChecks.map((c) => [c.id, c]));

describe("http-status", () => {
  it("passes on 200 without redirects", () => {
    expect(byId["http-status"].run(makeContext()).status).toBe("pass");
  });

  it("fails on 404", () => {
    const ctx = makeContext({
      http: { status: 404, redirectChain: [], headers: {}, https: true, ttfbMs: 100 },
    });
    expect(byId["http-status"].run(ctx).status).toBe("fail");
  });

  it("warns on long redirect chains", () => {
    const ctx = makeContext({
      http: {
        status: 200,
        redirectChain: ["a", "b", "c"],
        headers: {},
        https: true,
        ttfbMs: 100,
      },
    });
    expect(byId["http-status"].run(ctx).status).toBe("warn");
  });
});

describe("meta-noindex", () => {
  it("fails when meta robots contains noindex", () => {
    const ctx = makeContext({ extracted: { metaRobots: "noindex, nofollow" } });
    expect(byId["meta-noindex"].run(ctx).status).toBe("fail");
  });

  it("fails when X-Robots-Tag header contains noindex", () => {
    const ctx = makeContext({
      http: {
        status: 200,
        redirectChain: [],
        headers: { "x-robots-tag": "noindex" },
        https: true,
        ttfbMs: 100,
      },
    });
    expect(byId["meta-noindex"].run(ctx).status).toBe("fail");
  });

  it("passes without noindex", () => {
    expect(byId["meta-noindex"].run(makeContext()).status).toBe("pass");
  });
});

describe("canonical", () => {
  it("passes on self-referencing canonical", () => {
    const ctx = makeContext({ extracted: { canonical: "https://example.com/" } });
    expect(byId["canonical"].run(ctx).status).toBe("pass");
  });

  it("warns when canonical points elsewhere", () => {
    const ctx = makeContext({ extracted: { canonical: "https://example.com/other" } });
    expect(byId["canonical"].run(ctx).status).toBe("warn");
  });

  it("warns when canonical is missing", () => {
    expect(byId["canonical"].run(makeContext()).status).toBe("warn");
  });
});

describe("robots-allowed", () => {
  it("fails when robots.txt blocks Googlebot", () => {
    const ctx = makeContext({ robots: { exists: true, allowsUrl: false, sitemapUrls: [] } });
    expect(byId["robots-allowed"].run(ctx).status).toBe("fail");
  });

  it("passes when robots.txt is absent", () => {
    const ctx = makeContext({ robots: { exists: false, allowsUrl: true, sitemapUrls: [] } });
    expect(byId["robots-allowed"].run(ctx).status).toBe("pass");
  });
});
