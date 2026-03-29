import { describe, it, expect } from "vitest";
import { apiError, apiSuccess } from "../api-helpers";

describe("apiError", () => {
  it("returns JSON response with error message", async () => {
    const response = apiError("Not found", 404);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Not found" });
  });

  it("returns 400 status for bad request", async () => {
    const response = apiError("Invalid input", 400);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Invalid input" });
  });

  it("returns 500 status for server error", async () => {
    const response = apiError("Internal error", 500);
    expect(response.status).toBe(500);
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
