import type { AutocompleteOption } from "./cell-autocomplete";

export interface ColumnSearch {
  searchUrl: (churchId: string, q: string) => string;
  mapResponse: (data: unknown) => AutocompleteOption[];
}

type MapFn = (data: unknown) => AutocompleteOption[];

const mapAnthems: MapFn = (data) => {
  const results = (data as { results?: Array<{ id: string; title: string; composer: string }> }).results ?? [];
  return results.map((r) => ({ id: r.id, label: r.title, meta: r.composer }));
};
const mapMassSettings: MapFn = (data) => {
  const results = (data as { results?: Array<{ id: string; name: string; composer: string }> }).results ?? [];
  return results.map((r) => ({ id: r.id, label: r.name, meta: r.composer }));
};
const mapCanticleSettings: MapFn = (data) => {
  const results = (data as { results?: Array<{ id: string; name: string | null; composer: string }> }).results ?? [];
  return results.map((r) => ({ id: r.id, label: `${r.composer}${r.name ? " " + r.name : ""}`, meta: "Canticle setting" }));
};
const mapResponsesSettings: MapFn = (data) => {
  const results = (data as { results?: Array<{ id: string; name: string; composer: string }> }).results ?? [];
  return results.map((r) => ({ id: r.id, label: `${r.composer} ${r.name}`, meta: "Responses" }));
};

export function getColumnSearch(column: string, serviceType: string): ColumnSearch | null {
  const isEvensong = serviceType === "CHORAL_EVENSONG";
  switch (column) {
    case "introit":
      return { searchUrl: (cid, q) => `/api/search/anthems?churchId=${cid}&q=${encodeURIComponent(q)}`, mapResponse: mapAnthems };
    case "anthem":
      return { searchUrl: (cid, q) => `/api/search/anthems?churchId=${cid}&q=${encodeURIComponent(q)}`, mapResponse: mapAnthems };
    case "setting":
      return isEvensong
        ? { searchUrl: (cid, q) => `/api/search/canticle-settings?churchId=${cid}&q=${encodeURIComponent(q)}`, mapResponse: mapCanticleSettings }
        : { searchUrl: (cid, q) => `/api/search/mass-settings?churchId=${cid}&q=${encodeURIComponent(q)}`, mapResponse: mapMassSettings };
    case "respAccl":
      return isEvensong
        ? { searchUrl: (cid, q) => `/api/search/responses-settings?churchId=${cid}&q=${encodeURIComponent(q)}`, mapResponse: mapResponsesSettings }
        : null;
    default:
      return null;
  }
}
