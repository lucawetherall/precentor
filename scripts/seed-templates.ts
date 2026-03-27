/**
 * Seed the database with service type templates and template sections.
 * Derives data from the hardcoded TypeScript liturgy templates.
 *
 * Idempotent: uses onConflictDoUpdate keyed on serviceType for templates.
 * Sections are deleted and re-inserted on each run for correctness.
 *
 * Usage: npm run db:seed-templates
 */

import { db } from "@/lib/db";
import { liturgicalTexts, serviceTypeTemplates, templateSections } from "@/lib/db/schema-liturgy";
import { eq } from "drizzle-orm";

// ─── Section definition (mirrors LiturgicalSection from src/data/liturgy/types.ts) ─

interface SectionDef {
  id: string;
  title: string;
  majorSection?: string;
  blocks?: { speaker: string; text: string }[];
  musicSlotType?: string;
  placeholder?: string;
  optional?: boolean;
  allowOverride?: boolean;
}

// ─── Template definition ──────────────────────────────────────

interface TemplateDef {
  serviceType:
    | "SUNG_EUCHARIST"
    | "SAID_EUCHARIST"
    | "CHORAL_EVENSONG"
    | "CHORAL_MATINS"
    | "FAMILY_SERVICE"
    | "COMPLINE"
    | "CUSTOM";
  rite: string;
  name: string;
  description?: string;
  sections: SectionDef[];
}

// ─── CW Eucharist Order One sections ─────────────────────────

const CW_EUCHARIST_SECTIONS: SectionDef[] = [
  // THE GATHERING
  {
    id: "gathering.organ-voluntary",
    title: "Organ Voluntary",
    majorSection: "THE GATHERING",
    blocks: [],
    musicSlotType: "ORGAN_VOLUNTARY_PRE",
    optional: true,
  },
  {
    id: "gathering.entrance-hymn",
    title: "Entrance Hymn",
    blocks: [
      {
        speaker: "rubric",
        text: "All stand as the choir and clergy process. During the hymn, a collection may be taken.",
      },
    ],
    musicSlotType: "HYMN",
  },
  {
    id: "gathering.greeting",
    title: "The Greeting",
    blocks: [
      { speaker: "president", text: "In the name of the Father, and of the Son, and of the Holy Spirit." },
      { speaker: "all", text: "Amen." },
      { speaker: "president", text: "The Lord be with you" },
      { speaker: "all", text: "and also with you." },
    ],
    allowOverride: true,
  },
  {
    id: "gathering.prayer-of-preparation",
    title: "Prayer of Preparation",
    blocks: [],
  },
  {
    id: "gathering.confession",
    title: "Prayers of Penitence",
    blocks: [],
    allowOverride: true,
  },
  {
    id: "gathering.gloria",
    title: "Gloria in Excelsis",
    blocks: [],
    musicSlotType: "MASS_SETTING_GLORIA",
  },
  {
    id: "gathering.collect",
    title: "The Collect",
    blocks: [
      { speaker: "rubric", text: "The president introduces a period of silent prayer." },
      { speaker: "president", text: "Let us pray." },
      { speaker: "rubric", text: "Silence is kept." },
    ],
    placeholder: "collect",
  },

  // THE LITURGY OF THE WORD
  {
    id: "word.first-reading",
    title: "First Reading",
    majorSection: "THE LITURGY OF THE WORD",
    blocks: [
      { speaker: "rubric", text: "All sit." },
    ],
    placeholder: "reading-ot",
  },
  {
    id: "word.psalm",
    title: "Psalm",
    blocks: [],
    musicSlotType: "PSALM",
    placeholder: "reading-psalm",
  },
  {
    id: "word.second-reading",
    title: "Second Reading",
    blocks: [],
    placeholder: "reading-epistle",
  },
  {
    id: "word.gradual-hymn",
    title: "Gradual Hymn",
    blocks: [
      { speaker: "rubric", text: "All stand." },
    ],
    musicSlotType: "HYMN",
  },
  {
    id: "word.gospel-acclamation",
    title: "Gospel Acclamation",
    blocks: [],
    musicSlotType: "GOSPEL_ACCLAMATION",
    optional: true,
  },
  {
    id: "word.gospel",
    title: "Gospel Reading",
    blocks: [
      { speaker: "rubric", text: "All remain standing and turn to face the Gospel." },
      { speaker: "deacon", text: "Hear the Gospel of our Lord Jesus Christ according to N." },
      { speaker: "all", text: "Glory to you, O Lord." },
    ],
    placeholder: "reading-gospel",
  },
  {
    id: "word.gospel-end",
    title: "",
    blocks: [
      { speaker: "reader", text: "This is the Gospel of the Lord." },
      { speaker: "all", text: "Praise to you, O Christ." },
    ],
  },
  {
    id: "word.sermon",
    title: "Sermon",
    blocks: [
      { speaker: "rubric", text: "All sit. The preacher gives the sermon." },
    ],
    placeholder: "sermon",
    optional: true,
  },
  {
    id: "word.creed",
    title: "The Creed",
    blocks: [],
  },
  {
    id: "word.intercessions",
    title: "Prayers of Intercession",
    blocks: [],
    allowOverride: true,
  },

  // THE LITURGY OF THE SACRAMENT
  {
    id: "sacrament.peace",
    title: "The Peace",
    majorSection: "THE LITURGY OF THE SACRAMENT",
    blocks: [],
    allowOverride: true,
  },
  {
    id: "sacrament.offertory-hymn",
    title: "Offertory Hymn",
    blocks: [
      {
        speaker: "rubric",
        text: "During the hymn, the gifts of the people are gathered and presented. The table is prepared and bread and wine are placed upon it.",
      },
    ],
    musicSlotType: "HYMN",
  },
  {
    id: "sacrament.preparation",
    title: "Preparation of the Table",
    blocks: [],
    allowOverride: true,
  },
  {
    id: "sacrament.eucharistic-prayer",
    title: "The Eucharistic Prayer",
    blocks: [],
    placeholder: "eucharistic-prayer",
  },
  {
    id: "sacrament.lords-prayer",
    title: "The Lord\u2019s Prayer",
    blocks: [],
  },
  {
    id: "sacrament.breaking-of-bread",
    title: "Breaking of the Bread",
    blocks: [],
  },
  {
    id: "sacrament.agnus-dei",
    title: "Agnus Dei",
    blocks: [],
    musicSlotType: "MASS_SETTING_AGNUS",
  },
  {
    id: "sacrament.invitation",
    title: "Giving of Communion",
    blocks: [],
    allowOverride: true,
  },
  {
    id: "sacrament.communion-anthem",
    title: "Anthem",
    blocks: [],
    musicSlotType: "ANTHEM",
    optional: true,
  },
  {
    id: "sacrament.communion-hymn",
    title: "Communion Hymn",
    blocks: [],
    musicSlotType: "HYMN",
    optional: true,
  },
  {
    id: "sacrament.post-communion-silence",
    title: "Prayer after Communion",
    blocks: [],
    placeholder: "post-communion",
  },
  {
    id: "sacrament.post-communion-common",
    title: "",
    blocks: [],
  },

  // THE DISMISSAL
  {
    id: "dismissal.final-hymn",
    title: "Final Hymn",
    majorSection: "THE DISMISSAL",
    blocks: [],
    musicSlotType: "HYMN",
  },
  {
    id: "dismissal.blessing",
    title: "The Blessing",
    blocks: [],
    allowOverride: true,
  },
  {
    id: "dismissal.dismissal",
    title: "The Dismissal",
    blocks: [],
  },
  {
    id: "dismissal.organ-voluntary",
    title: "Organ Voluntary",
    blocks: [],
    musicSlotType: "ORGAN_VOLUNTARY_POST",
    optional: true,
  },
];

// ─── BCP Evensong sections ────────────────────────────────────

const BCP_EVENSONG_SECTIONS: SectionDef[] = [
  // THE INTRODUCTORY RITE
  {
    id: "evensong.organ-voluntary",
    title: "Organ Voluntary",
    majorSection: "THE INTRODUCTORY RITE",
    blocks: [],
    musicSlotType: "ORGAN_VOLUNTARY_PRE",
    optional: true,
  },
  {
    id: "evensong.hymn-processional",
    title: "Processional Hymn",
    blocks: [],
    musicSlotType: "HYMN",
    optional: true,
  },
  {
    id: "evensong.sentences",
    title: "Opening Sentences",
    blocks: [],
    allowOverride: true,
  },
  {
    id: "evensong.confession",
    title: "A General Confession",
    blocks: [],
  },
  {
    id: "evensong.absolution",
    title: "The Absolution",
    blocks: [],
  },

  // THE OFFICE
  {
    id: "evensong.lords-prayer",
    title: "The Lord's Prayer",
    majorSection: "THE OFFICE",
    blocks: [],
  },
  {
    id: "evensong.preces",
    title: "Preces",
    blocks: [],
    musicSlotType: "RESPONSES",
  },
  {
    id: "evensong.psalm",
    title: "The Psalm",
    blocks: [],
    musicSlotType: "PSALM",
    placeholder: "reading-psalm",
  },
  {
    id: "evensong.first-lesson",
    title: "The First Lesson",
    blocks: [],
    placeholder: "reading-ot",
  },
  {
    id: "evensong.magnificat",
    title: "Magnificat",
    blocks: [],
    musicSlotType: "CANTICLE_MAGNIFICAT",
  },
  {
    id: "evensong.second-lesson",
    title: "The Second Lesson",
    blocks: [],
    placeholder: "reading-epistle",
  },
  {
    id: "evensong.nunc-dimittis",
    title: "Nunc Dimittis",
    blocks: [],
    musicSlotType: "CANTICLE_NUNC_DIMITTIS",
  },

  // THE CREED AND PRAYERS
  {
    id: "evensong.creed",
    title: "The Apostles' Creed",
    majorSection: "THE CREED AND PRAYERS",
    blocks: [],
  },
  {
    id: "evensong.lesser-litany",
    title: "The Lesser Litany",
    blocks: [],
  },
  {
    id: "evensong.lords-prayer-2",
    title: "The Lord's Prayer",
    blocks: [],
  },
  {
    id: "evensong.responses",
    title: "The Responses",
    blocks: [],
  },
  {
    id: "evensong.collect",
    title: "The Collect of the Day",
    blocks: [],
    placeholder: "collect",
  },
  {
    id: "evensong.collect-peace",
    title: "The Second Collect, for Peace",
    blocks: [],
  },
  {
    id: "evensong.collect-aid",
    title: "The Third Collect, for Aid against all Perils",
    blocks: [],
  },

  // THE CONCLUSION
  {
    id: "evensong.anthem",
    title: "Anthem",
    majorSection: "THE CONCLUSION",
    blocks: [],
    musicSlotType: "ANTHEM",
    optional: true,
  },
  {
    id: "evensong.intercessions",
    title: "Prayers",
    blocks: [],
    optional: true,
    allowOverride: true,
  },
  {
    id: "evensong.hymn",
    title: "Hymn",
    blocks: [],
    musicSlotType: "HYMN",
  },
  {
    id: "evensong.blessing",
    title: "The Blessing",
    blocks: [],
    allowOverride: true,
  },
  {
    id: "evensong.organ-voluntary-post",
    title: "Organ Voluntary",
    blocks: [],
    musicSlotType: "ORGAN_VOLUNTARY_POST",
    optional: true,
  },
];

// ─── Section key → liturgicalTexts key mapping ────────────────
// Maps section IDs to the keys used in the liturgicalTexts table
// (seeded by seed-liturgical-texts.ts). Only sections whose full
// text is stored as a named liturgical text need an entry here.

const SECTION_TO_TEXT_KEY: Record<string, string> = {
  // CW Eucharist
  "gathering.greeting": "greeting-cw",
  "gathering.prayer-of-preparation": "prayer-of-preparation",
  "gathering.confession": "confession-cw",
  "gathering.gloria": "gloria-in-excelsis",
  "word.creed": "nicene-creed",
  "word.intercessions": "intercessions-cw",
  "sacrament.peace": "peace-cw",
  "sacrament.preparation": "preparation-of-table-cw",
  "sacrament.lords-prayer": "lords-prayer-cw",
  "sacrament.breaking-of-bread": "breaking-of-bread-cw",
  "sacrament.agnus-dei": "agnus-dei",
  "sacrament.invitation": "invitation-to-communion-cw",
  "sacrament.post-communion-common": "post-communion-prayer-cw",
  "dismissal.blessing": "blessing-cw",
  "dismissal.dismissal": "dismissal-cw",

  // BCP Evensong
  "evensong.sentences": "opening-sentences-bcp",
  "evensong.confession": "confession-bcp",
  "evensong.absolution": "absolution-bcp",
  "evensong.lords-prayer": "lords-prayer-bcp",
  "evensong.lords-prayer-2": "lords-prayer-bcp",
  "evensong.preces": "preces-bcp",
  "evensong.magnificat": "magnificat",
  "evensong.nunc-dimittis": "nunc-dimittis",
  "evensong.creed": "apostles-creed",
  "evensong.lesser-litany": "lesser-litany-bcp",
  "evensong.responses": "responses-bcp",
  "evensong.collect-peace": "collect-peace-bcp",
  "evensong.collect-aid": "collect-aid-bcp",
  "evensong.blessing": "blessing-bcp",
};

// ─── Templates to seed ────────────────────────────────────────

const TEMPLATES: TemplateDef[] = [
  {
    serviceType: "SUNG_EUCHARIST",
    rite: "Common Worship Order One",
    name: "Sung Eucharist",
    description: "Common Worship Holy Communion Order One with music",
    sections: CW_EUCHARIST_SECTIONS,
  },
  {
    serviceType: "SAID_EUCHARIST",
    rite: "Common Worship Order One",
    name: "Said Eucharist",
    description: "Common Worship Holy Communion Order One without music",
    sections: CW_EUCHARIST_SECTIONS,
  },
  {
    serviceType: "CHORAL_EVENSONG",
    rite: "BCP Evening Prayer",
    name: "Choral Evensong",
    description: "Book of Common Prayer Evening Prayer (1662)",
    sections: BCP_EVENSONG_SECTIONS,
  },
  {
    serviceType: "CHORAL_MATINS",
    rite: "BCP Morning Prayer",
    name: "Choral Matins",
    description: "Book of Common Prayer Morning Prayer (1662)",
    sections: [],
  },
  {
    serviceType: "FAMILY_SERVICE",
    rite: "Common Worship",
    name: "Family Service",
    description: "All-age worship service",
    sections: [],
  },
  {
    serviceType: "COMPLINE",
    rite: "Common Worship",
    name: "Compline",
    description: "Night Prayer",
    sections: [],
  },
  {
    serviceType: "CUSTOM",
    rite: "Custom",
    name: "Custom Service",
    description: "Custom service with no default sections",
    sections: [],
  },
];

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  // Build a lookup map from liturgicalTexts key → id
  console.log("Loading liturgical texts for cross-reference...");
  const allTexts = await db.select({ id: liturgicalTexts.id, key: liturgicalTexts.key }).from(liturgicalTexts);
  const textKeyToId = new Map<string, string>(allTexts.map((t) => [t.key, t.id]));
  console.log(`  Found ${textKeyToId.size} liturgical texts`);

  for (const template of TEMPLATES) {
    console.log(`\nSeeding template: ${template.serviceType} (${template.name})`);

    // Upsert the template row
    const [inserted] = await db
      .insert(serviceTypeTemplates)
      .values({
        serviceType: template.serviceType,
        rite: template.rite,
        name: template.name,
        description: template.description ?? null,
      })
      .onConflictDoUpdate({
        target: serviceTypeTemplates.serviceType,
        set: {
          rite: template.rite,
          name: template.name,
          description: template.description ?? null,
          updatedAt: new Date(),
        },
      })
      .returning({ id: serviceTypeTemplates.id });

    const templateId = inserted.id;
    console.log(`  Template id: ${templateId}`);

    // Delete existing sections so we can re-insert cleanly (idempotent)
    await db.delete(templateSections).where(eq(templateSections.templateId, templateId));

    if (template.sections.length === 0) {
      console.log(`  No sections for ${template.serviceType} (placeholder)`);
      continue;
    }

    // Insert sections
    const sectionRows = template.sections.map((section, index) => {
      const textKey = SECTION_TO_TEXT_KEY[section.id];
      const liturgicalTextId = textKey ? (textKeyToId.get(textKey) ?? null) : null;

      if (textKey && !liturgicalTextId) {
        console.warn(`  WARN: liturgicalTexts key "${textKey}" not found for section "${section.id}"`);
      }

      return {
        templateId,
        sectionKey: section.id,
        title: section.title,
        majorSection: section.majorSection ?? null,
        positionOrder: index,
        liturgicalTextId,
        musicSlotType: (section.musicSlotType as typeof templateSections.$inferInsert["musicSlotType"]) ?? null,
        placeholderType: section.placeholder ?? null,
        optional: section.optional ?? false,
        allowOverride: section.allowOverride ?? false,
      };
    });

    await db.insert(templateSections).values(sectionRows);
    console.log(`  Inserted ${sectionRows.length} sections`);
  }

  console.log("\nSeed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
