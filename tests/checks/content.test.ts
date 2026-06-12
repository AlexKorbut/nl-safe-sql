import { describe, it, expect } from "vitest";
import { contentChecks } from "@/server/audit/checks/content";
import { makeContext } from "../fixtures/context";

const byId = Object.fromEntries(contentChecks.map((c) => [c.id, c]));

describe("title-tag", () => {
  it("passes for a normal title", () => {
    expect(byId["title-tag"].run(makeContext()).status).toBe("pass");
  });

  it("fails when missing", () => {
    const ctx = makeContext({ extracted: { title: undefined } });
    expect(byId["title-tag"].run(ctx).status).toBe("fail");
  });

  it("warns when too short", () => {
    const ctx = makeContext({ extracted: { title: "Hi" } });
    expect(byId["title-tag"].run(ctx).status).toBe("warn");
  });
});

describe("h1", () => {
  it("fails with zero H1s", () => {
    const ctx = makeContext({ extracted: { h1s: [] } });
    expect(byId["h1"].run(ctx).status).toBe("fail");
  });

  it("warns with multiple H1s", () => {
    const ctx = makeContext({ extracted: { h1s: ["a", "b"] } });
    expect(byId["h1"].run(ctx).status).toBe("warn");
  });
});

describe("content-depth", () => {
  it("fails on thin content", () => {
    const ctx = makeContext({ extracted: { wordCount: 50 } });
    expect(byId["content-depth"].run(ctx).status).toBe("fail");
  });

  it("passes on substantive content", () => {
    expect(byId["content-depth"].run(makeContext()).status).toBe("pass");
  });
});

describe("llm checks", () => {
  it("returns na without an LLM assessment", () => {
    expect(byId["llm-eeat"].run(makeContext()).status).toBe("na");
  });

  it("scales the LLM score when present", () => {
    const ctx = makeContext({
      llm: {
        eeat: { score: 85, reasons: ["good"] },
        helpfulness: { score: 50, reasons: [] },
        citability: { score: 30, reasons: [] },
        clarity: { score: 90, reasons: [] },
        adsRelevance: { score: 70, misleadingFlags: [] },
      },
    });
    const result = byId["llm-eeat"].run(ctx);
    expect(result.status).toBe("pass");
    expect(result.score).toBe(85);
  });
});

describe("heading-structure", () => {
  it("warns on skipped levels", () => {
    const ctx = makeContext({
      extracted: {
        headings: [
          { level: 1, text: "a" },
          { level: 4, text: "b" },
        ],
      },
    });
    expect(byId["heading-structure"].run(ctx).status).toBe("warn");
  });
});
