export interface RoleCatalogSeedRow {
  key: string;
  defaultName: string;
  category: "VOICE" | "MUSIC_DIRECTION" | "MUSIC_INSTRUMENT" | "CLERGY_PARISH" | "CLERGY_CATHEDRAL" | "LAY_MINISTRY";
  rotaEligible: boolean;
  institutional: boolean;
  defaultExclusive: boolean;
  defaultMinCount: number;
  defaultMaxCount: number | null;
  displayOrder: number;
}

export const ROLE_CATALOG_SEED: RoleCatalogSeedRow[] = [
  // VOICE
  { key: "SOPRANO", defaultName: "Soprano", category: "VOICE", rotaEligible: true, institutional: false, defaultExclusive: false, defaultMinCount: 1, defaultMaxCount: null, displayOrder: 100 },
  { key: "ALTO",    defaultName: "Alto",    category: "VOICE", rotaEligible: true, institutional: false, defaultExclusive: false, defaultMinCount: 1, defaultMaxCount: null, displayOrder: 110 },
  { key: "TENOR",   defaultName: "Tenor",   category: "VOICE", rotaEligible: true, institutional: false, defaultExclusive: false, defaultMinCount: 1, defaultMaxCount: null, displayOrder: 120 },
  { key: "BASS",    defaultName: "Bass",    category: "VOICE", rotaEligible: true, institutional: false, defaultExclusive: false, defaultMinCount: 1, defaultMaxCount: null, displayOrder: 130 },
  // MUSIC_DIRECTION
  { key: "DIRECTOR",           defaultName: "Director",           category: "MUSIC_DIRECTION", rotaEligible: true,  institutional: false, defaultExclusive: true, defaultMinCount: 1, defaultMaxCount: 1,    displayOrder: 200 },
  { key: "ASSISTANT_DIRECTOR", defaultName: "Assistant Director", category: "MUSIC_DIRECTION", rotaEligible: true,  institutional: false, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 210 },
  { key: "DIRECTOR_OF_MUSIC",  defaultName: "Director of Music",  category: "MUSIC_DIRECTION", rotaEligible: false, institutional: true,  defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 220 },
  { key: "ASSISTANT_DIRECTOR_OF_MUSIC", defaultName: "Assistant Director of Music", category: "MUSIC_DIRECTION", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 230 },
  // MUSIC_INSTRUMENT
  { key: "ORGANIST",            defaultName: "Organist",            category: "MUSIC_INSTRUMENT", rotaEligible: true, institutional: false, defaultExclusive: true,  defaultMinCount: 1, defaultMaxCount: 1,    displayOrder: 300 },
  { key: "ASSISTANT_ORGANIST",  defaultName: "Assistant Organist",  category: "MUSIC_INSTRUMENT", rotaEligible: true, institutional: false, defaultExclusive: true,  defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 310 },
  { key: "SUB_ORGANIST",        defaultName: "Sub-Organist",        category: "MUSIC_INSTRUMENT", rotaEligible: true, institutional: true,  defaultExclusive: true,  defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 320 },
  { key: "DEPUTY_ORGANIST",     defaultName: "Deputy Organist",     category: "MUSIC_INSTRUMENT", rotaEligible: true, institutional: false, defaultExclusive: true,  defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 330 },
  { key: "ORGAN_SCHOLAR",       defaultName: "Organ Scholar",       category: "MUSIC_INSTRUMENT", rotaEligible: true, institutional: true,  defaultExclusive: true,  defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 340 },
  { key: "INSTRUMENTALIST",     defaultName: "Instrumentalist",     category: "MUSIC_INSTRUMENT", rotaEligible: true, institutional: false, defaultExclusive: false, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 350 },
  // CLERGY_PARISH
  { key: "VICAR",             defaultName: "Vicar",             category: "CLERGY_PARISH", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 400 },
  { key: "RECTOR",            defaultName: "Rector",            category: "CLERGY_PARISH", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 410 },
  { key: "PRIEST_IN_CHARGE",  defaultName: "Priest-in-Charge",  category: "CLERGY_PARISH", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 420 },
  { key: "ASSOCIATE_VICAR",   defaultName: "Associate Vicar",   category: "CLERGY_PARISH", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 430 },
  { key: "CURATE",            defaultName: "Curate",            category: "CLERGY_PARISH", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 440 },
  { key: "DEACON",            defaultName: "Deacon",            category: "CLERGY_PARISH", rotaEligible: true,  institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 450 },
  { key: "SUBDEACON",         defaultName: "Subdeacon",         category: "CLERGY_PARISH", rotaEligible: true,  institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 460 },
  // CLERGY_CATHEDRAL
  { key: "BISHOP",             defaultName: "Bishop",             category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 500 },
  { key: "ARCHBISHOP",         defaultName: "Archbishop",         category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 510 },
  { key: "DEAN",               defaultName: "Dean",               category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 520 },
  { key: "SUB_DEAN",           defaultName: "Sub-Dean",           category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 530 },
  { key: "PROVOST",            defaultName: "Provost",            category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 540 },
  { key: "ARCHDEACON",         defaultName: "Archdeacon",         category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 550 },
  { key: "CANON_RESIDENTIARY", defaultName: "Canon Residentiary", category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: false, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 560 },
  { key: "CANON_PRECENTOR",    defaultName: "Canon Precentor",    category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 570 },
  { key: "CANON_CHANCELLOR",   defaultName: "Canon Chancellor",   category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 580 },
  { key: "CANON_TREASURER",    defaultName: "Canon Treasurer",    category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 590 },
  { key: "CANON_MISSIONER",    defaultName: "Canon Missioner",    category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 600 },
  { key: "HONORARY_CANON",     defaultName: "Honorary Canon",     category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: false, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 610 },
  { key: "LAY_CANON",          defaultName: "Lay Canon",          category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: false, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 620 },
  { key: "PREBENDARY",         defaultName: "Prebendary",         category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: false, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 630 },
  { key: "SUCCENTOR",          defaultName: "Succentor",          category: "CLERGY_CATHEDRAL", rotaEligible: false, institutional: true, defaultExclusive: true, defaultMinCount: 0, defaultMaxCount: 1,    displayOrder: 640 },
  // LAY_MINISTRY
  { key: "LLM",                     defaultName: "Licensed Lay Minister (Reader)", category: "LAY_MINISTRY", rotaEligible: true, institutional: true, defaultExclusive: false, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 700 },
  { key: "LAY_PASTORAL_MINISTER",   defaultName: "Lay Pastoral Minister",          category: "LAY_MINISTRY", rotaEligible: false, institutional: true, defaultExclusive: false, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 710 },
  { key: "LAY_WORSHIP_LEADER",      defaultName: "Lay Worship Leader",             category: "LAY_MINISTRY", rotaEligible: true, institutional: false, defaultExclusive: false, defaultMinCount: 0, defaultMaxCount: null, displayOrder: 720 },
];
