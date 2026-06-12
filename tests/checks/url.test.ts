import { describe, it, expect } from "vitest";
import { normalizeUrl } from "@/lib/url";

describe("normalizeUrl", () => {
  it("adds https scheme when missing", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com/");
  });

  it("keeps an explicit http scheme", () => {
    expect(normalizeUrl("http://example.com/page")).toBe("http://example.com/page");
  });

  it("rejects garbage", () => {
    expect(normalizeUrl("not a url")).toBeNull();
    expect(normalizeUrl("")).toBeNull();
  });

  it("rejects private and loopback hosts", () => {
    expect(normalizeUrl("http://localhost:3000")).toBeNull();
    expect(normalizeUrl("http://127.0.0.1")).toBeNull();
    expect(normalizeUrl("http://192.168.1.1")).toBeNull();
    expect(normalizeUrl("http://10.0.0.5")).toBeNull();
  });

  it("strips fragments", () => {
    expect(normalizeUrl("https://example.com/page#section")).toBe("https://example.com/page");
  });
});
