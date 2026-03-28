// Shared TypeScript types for Precentor

export type ServiceType =
  | "SUNG_EUCHARIST"
  | "CHORAL_EVENSONG"
  | "SAID_EUCHARIST"
  | "CHORAL_MATINS"
  | "FAMILY_SERVICE"
  | "COMPLINE"
  | "CUSTOM";

export type MusicSlotType =
  | "HYMN"
  | "PSALM"
  | "ANTHEM"
  | "MASS_SETTING_KYRIE"
  | "MASS_SETTING_GLORIA"
  | "MASS_SETTING_SANCTUS"
  | "MASS_SETTING_AGNUS"
  | "MASS_SETTING_GLOBAL"
  | "ORGAN_VOLUNTARY_PRE"
  | "ORGAN_VOLUNTARY_POST"
  | "ORGAN_VOLUNTARY_OFFERTORY"
  | "CANTICLE_MAGNIFICAT"
  | "CANTICLE_NUNC_DIMITTIS"
  | "RESPONSES"
  | "GOSPEL_ACCLAMATION"
  | "OTHER";

export type LiturgicalSeason =
  | "ADVENT"
  | "CHRISTMAS"
  | "EPIPHANY"
  | "LENT"
  | "HOLY_WEEK"
  | "EASTER"
  | "ASCENSION"
  | "PENTECOST"
  | "TRINITY"
  | "ORDINARY"
  | "KINGDOM";

export type LiturgicalColour =
  | "PURPLE"
  | "WHITE"
  | "GOLD"
  | "GREEN"
  | "RED"
  | "ROSE";

export type MemberRole = "ADMIN" | "EDITOR" | "MEMBER";

export type VoicePart = "SOPRANO" | "ALTO" | "TENOR" | "BASS";

export type HymnBook = "NEH" | "AM";

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  SUNG_EUCHARIST: "Sung Eucharist",
  CHORAL_EVENSONG: "Choral Evensong",
  SAID_EUCHARIST: "Said Eucharist",
  CHORAL_MATINS: "Choral Matins",
  FAMILY_SERVICE: "Family Service",
  COMPLINE: "Compline",
  CUSTOM: "Custom Service",
};

export const MUSIC_SLOT_LABELS: Record<MusicSlotType, string> = {
  HYMN: "Hymn",
  PSALM: "Psalm",
  ANTHEM: "Anthem",
  MASS_SETTING_KYRIE: "Kyrie",
  MASS_SETTING_GLORIA: "Gloria",
  MASS_SETTING_SANCTUS: "Sanctus & Benedictus",
  MASS_SETTING_AGNUS: "Agnus Dei",
  MASS_SETTING_GLOBAL: "Mass Setting",
  ORGAN_VOLUNTARY_PRE: "Organ Voluntary (Pre)",
  ORGAN_VOLUNTARY_POST: "Organ Voluntary (Post)",
  ORGAN_VOLUNTARY_OFFERTORY: "Offertory Voluntary",
  CANTICLE_MAGNIFICAT: "Magnificat",
  CANTICLE_NUNC_DIMITTIS: "Nunc Dimittis",
  RESPONSES: "Responses",
  GOSPEL_ACCLAMATION: "Gospel Acclamation",
  OTHER: "Other",
};

export const LITURGICAL_COLOURS: Record<LiturgicalColour, string> = {
  PURPLE: "#5B2C6F",
  WHITE: "#F5F0E8",
  GOLD: "#D4AF37",
  GREEN: "#4A6741",
  RED: "#8B2500",
  ROSE: "#C48A9F",
};

// Eucharist music slot template
export const EUCHARIST_SLOTS: MusicSlotType[] = [
  "ORGAN_VOLUNTARY_PRE",
  "HYMN", // Entrance
  "MASS_SETTING_KYRIE",
  "MASS_SETTING_GLORIA",
  "HYMN", // Gradual
  "GOSPEL_ACCLAMATION",
  "HYMN", // Offertory
  "MASS_SETTING_SANCTUS",
  "MASS_SETTING_AGNUS",
  "ANTHEM",
  "HYMN", // Communion
  "HYMN", // Post-communion / Recessional
  "ORGAN_VOLUNTARY_POST",
];

// Evensong music slot template
export const EVENSONG_SLOTS: MusicSlotType[] = [
  "ORGAN_VOLUNTARY_PRE",
  "RESPONSES",
  "PSALM",
  "CANTICLE_MAGNIFICAT",
  "CANTICLE_NUNC_DIMITTIS",
  "ANTHEM",
  "HYMN", // Office Hymn
  "HYMN", // Final
  "ORGAN_VOLUNTARY_POST",
];

export const POSITION_LABELS: Record<string, string> = {
  OLD_TESTAMENT: "Old Testament",
  PSALM: "Psalm",
  NEW_TESTAMENT: "New Testament",
  GOSPEL: "Gospel",
  CANTICLE: "Canticle",
};
