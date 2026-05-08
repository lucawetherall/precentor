import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseJsonBody } from "../parse-body";

const schema = z.object({
  name: z.string().min(1),
  age: z.number().int().nonnegative(),
});

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function malformedRequest(rawBody: string): Request {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });
}

describe("parseJsonBody", () => {
  it("returns typed data on success", async () => {
    const req = jsonRequest({ name: "Alma", age: 9 });
    const result = await parseJsonBody(req, schema);
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ name: "Alma", age: 9 });
  });

  it("returns 400 NextResponse on invalid JSON", async () => {
    const req = malformedRequest("{not valid json");
    const result = await parseJsonBody(req, schema);
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error!.status).toBe(400);
    const body = await result.error!.json();
    expect(body.error).toBe("Invalid JSON");
    expect(body.code).toBe("INVALID_INPUT");
  });

  it("returns 400 NextResponse on schema validation failure", async () => {
    const req = jsonRequest({ name: "", age: 9 });
    const result = await parseJsonBody(req, schema);
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error!.status).toBe(400);
    const body = await result.error!.json();
    // First issue message should be returned (Zod's default min-length message
    // for `z.string().min(1)`).
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
    expect(body.code).toBe("INVALID_INPUT");
  });

  it("returns 400 NextResponse when the body is missing required fields", async () => {
    const req = jsonRequest({ name: "Alma" }); // missing `age`
    const result = await parseJsonBody(req, schema);
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error!.status).toBe(400);
  });

  it("returns 400 when the body parses but is the wrong shape entirely", async () => {
    const req = jsonRequest("not an object");
    const result = await parseJsonBody(req, schema);
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error!.status).toBe(400);
  });
});
