import { describe, it, expect } from "vitest";
import { parseCsvToRows } from "../csv-parse";

describe("parseCsvToRows", () => {
  it("parses a valid 2-row CSV", () => {
    const csv = `date,service_type,time,introit,hymns,setting,psalm,chant,responses_acclamations,anthem,voluntary,info
2026-05-03,SUNG_EUCHARIST,10:00,,"117, 103",Darke in F,118,,,Ave verum,,note
2026-05-03,Choral Evensong,18:00,,,Howells,104,Smart,Smith,Like as the hart,,`;
    const result = parseCsvToRows(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].status).toBe("valid");
    expect(result.rows[0].data?.serviceType).toBe("SUNG_EUCHARIST");
    expect(result.rows[1].data?.serviceType).toBe("CHORAL_EVENSONG");
  });
  it("flags invalid dates", () => {
    const csv = `date,service_type,time,introit,hymns,setting,psalm,chant,responses_acclamations,anthem,voluntary,info
not-a-date,SUNG_EUCHARIST,,,,,,,,,,,`;
    const result = parseCsvToRows(csv);
    expect(result.rows[0].status).toBe("invalid");
    expect(result.rows[0].error).toMatch(/date/i);
  });
  it("flags unknown service types", () => {
    const csv = `date,service_type,time,introit,hymns,setting,psalm,chant,responses_acclamations,anthem,voluntary,info
2026-05-03,Dinner Party,,,,,,,,,,,`;
    const result = parseCsvToRows(csv);
    expect(result.rows[0].status).toBe("invalid");
    expect(result.rows[0].error).toMatch(/service_type/i);
  });
});
