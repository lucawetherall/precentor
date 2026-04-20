import Papa from "papaparse";
import { resolveServiceType } from "./cell-parsers";

export interface CsvParsedRow {
  status: "valid" | "invalid";
  error?: string;
  raw: Record<string, string>;
  data?: {
    date: string;
    serviceType: string;
    time: string | null;
    introit: string;
    hymns: string;
    setting: string;
    psalm: string;
    chant: string;
    respAccl: string;
    anthem: string;
    voluntary: string;
    info: string;
  };
}

export interface CsvParseResult {
  rows: CsvParsedRow[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseCsvToRows(csv: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const rows: CsvParsedRow[] = parsed.data.map((r) => {
    const date = (r.date ?? "").trim();
    const serviceTypeRaw = (r.service_type ?? "").trim();
    if (!DATE_RE.test(date)) return { status: "invalid", error: "bad date", raw: r };
    const serviceType = resolveServiceType(serviceTypeRaw);
    if (!serviceType) return { status: "invalid", error: `unknown service_type "${serviceTypeRaw}"`, raw: r };
    return {
      status: "valid",
      raw: r,
      data: {
        date,
        serviceType,
        time: (r.time ?? "").trim() || null,
        introit: (r.introit ?? "").trim(),
        hymns: (r.hymns ?? "").trim(),
        setting: (r.setting ?? "").trim(),
        psalm: (r.psalm ?? "").trim(),
        chant: (r.chant ?? "").trim(),
        respAccl: (r.responses_acclamations ?? "").trim(),
        anthem: (r.anthem ?? "").trim(),
        voluntary: (r.voluntary ?? "").trim(),
        info: (r.info ?? "").trim(),
      },
    };
  });
  return { rows };
}
