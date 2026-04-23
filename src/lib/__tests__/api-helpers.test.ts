import { describe, it, expect } from "vitest";
import { apiError, apiSuccess } from "../api-helpers";

describe("apiError", () => {
  it("returns JSON response with error message and inferred code", async () => {
    const response = apiError("Not found", 404);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Not found", code: "NOT_FOUND" });
  });

  it("returns 400 status with INVALID_INPUT code", async () => {
    const response = apiError("Invalid input", 400);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Invalid input", code: "INVALID_INPUT" });
  });

  it("returns 500 status for server error", async () => {
    const response = apiError("Internal error", 500);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe("INTERNAL");
  });

  it("allows explicit code override", async () => {
    const response = apiError("Nope", 403, { code: "FORBIDDEN" });
    const body = await response.json();
    expect(body.code).toBe("FORBIDDEN");
  });

  it("includes details when provided", async () => {
    const response = apiError("Bad", 422, { details: { fieldErrors: { email: "required" } } });
    const body = await response.json();
    expect(body.details).toEqual({ fieldErrors: { email: "required" } });
  });
});

describe("apiSuccess", () => {
  it("returns JSON response with data and default 200 status", async () => {
    const response = apiSuccess({ id: "123", name: "Test" });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ id: "123", name: "Test" });
  });

  it("returns custom status code", async () => {
    const response = apiSuccess({ created: true }, 201);
    expect(response.status).toBe(201);
  });

  it("handles array data", async () => {
    const response = apiSuccess([1, 2, 3]);
    const body = await response.json();
    expect(body).toEqual([1, 2, 3]);
  });

  it("handles null data", async () => {
    const response = apiSuccess(null);
    const body = await response.json();
    expect(body).toBeNull();
  });
});
