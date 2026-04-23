export function buildCsvTemplate(): string {
  const header = "date,service_type,time,introit,hymns,setting,psalm,chant,responses_acclamations,anthem,voluntary,info";
  const rows = [
    "2026-05-03,SUNG_EUCHARIST,10:00,Locus iste,\"117, 103, 271, 295\",Darke in F,118,Barnby,,Ave verum,,Choir 9:30 rehearsal",
    "2026-05-03,CHORAL_EVENSONG,18:00,,,\"Howells Coll Reg\",104,Smart,Smith,Like as the hart,,",
    "2026-05-10,SUNG_EUCHARIST,10:00,,,,,,,,,",
  ];
  return [header, ...rows].join("\n") + "\n";
}

export function downloadCsvTemplate(): void {
  const csv = buildCsvTemplate();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "precentor-planning-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
