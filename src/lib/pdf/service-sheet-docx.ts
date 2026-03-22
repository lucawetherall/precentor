import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Packer,
} from "docx";
import type { ServiceSheetData } from "./service-sheet";
import { SERVICE_TYPE_DISPLAY } from "./service-sheet";
import type {
  BookletServiceSheetData,
  SummaryServiceSheetData,
  MusicSlotEntry,
} from "@/types/service-sheet";
import type { LiturgicalTextBlock } from "@/data/liturgy/types";
import { accentColourDocx } from "./theme";
import { resolveTemplate } from "./resolve-template";
import { MUSIC_SLOT_LABELS } from "@/types";

// ─── Legacy support (old flat ServiceSheetData) ─────────────────

/** @deprecated — kept for backward compat with old API route data shape */
function accentColourLegacy(colour: string): string {
  const map: Record<string, string> = {
    PURPLE: "5B2C6F", WHITE: "8B7D6B", GOLD: "D4AF37",
    GREEN: "4A6741", RED: "8B2500", ROSE: "C48A9F",
    Purple: "5B2C6F", White: "8B7D6B", Gold: "D4AF37",
    Green: "4A6741", Red: "8B2500", Rose: "C48A9F",
  };
  return map[colour] ?? "D4C5B2";
}

function buildServiceSection(data: ServiceSheetData): Paragraph[] {
  const accent = accentColourLegacy(data.colour);
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: data.churchName, bold: true, size: 28, font: "Times New Roman" }),
      ],
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: SERVICE_TYPE_DISPLAY[data.serviceType] || data.serviceType,
          bold: true, size: 36, font: "Times New Roman",
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: data.liturgicalName, size: 22, font: "Times New Roman" }),
      ],
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: data.date, size: 22, font: "Times New Roman", color: "6B5D4D" }),
      ],
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: accent } },
      children: [
        new TextRun({ text: `${data.season} — ${data.colour}`, size: 18, font: "Times New Roman", color: accent }),
      ],
    })
  );

  if (data.collect) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: accent } },
        children: [new TextRun({ text: "Collect", bold: true, size: 24, font: "Times New Roman" })],
      })
    );
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: data.collect, italics: true, size: 20, font: "Times New Roman" }),
        ],
      })
    );
  }

  if (data.readings.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: accent } },
        children: [new TextRun({ text: "Readings", bold: true, size: 24, font: "Times New Roman" })],
      })
    );
    for (const reading of data.readings) {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: `${reading.position}: `, italics: true, size: 20, font: "Times New Roman" }),
            new TextRun({ text: reading.reference, size: 20, font: "Times New Roman" }),
          ],
        })
      );
    }
    children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  }

  if (data.musicSlots.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: accent } },
        children: [new TextRun({ text: "Music", bold: true, size: 24, font: "Times New Roman" })],
      })
    );
    for (const slot of data.musicSlots) {
      const runs: TextRun[] = [
        new TextRun({ text: `${slot.label}: `, bold: true, size: 20, font: "Times New Roman" }),
        new TextRun({ text: slot.value, size: 20, font: "Times New Roman" }),
      ];
      if (slot.hymnNumber) {
        runs.push(new TextRun({ text: ` [${slot.hymnNumber}]`, italics: true, size: 18, font: "Times New Roman", color: "6B5D4D" }));
      }
      if (slot.notes) {
        runs.push(new TextRun({ text: ` (${slot.notes})`, italics: true, size: 18, font: "Times New Roman", color: "6B5D4D" }));
      }
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: runs,
        })
      );
    }
  }

  children.push(
    new Paragraph({
      spacing: { before: 400 },
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: accent } },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Generated by Precentor — Church Music Planner",
          size: 16, font: "Times New Roman", color: "6B5D4D",
        }),
      ],
    })
  );

  return children;
}

export async function generateServiceSheetDocx(
  data: ServiceSheetData
): Promise<Buffer> {
  const doc = new Document({
    sections: [{ children: buildServiceSection(data) }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function generateMultiServiceDocx(
  sheets: ServiceSheetData[]
): Promise<Buffer> {
  const doc = new Document({
    sections: sheets.map((data, idx) => ({
      children: buildServiceSection(data),
      properties: idx > 0 ? { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } } : undefined,
    })),
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

// ─── New booklet DOCX generation ─────────────────────────────────

const SPEAKER_LABELS: Record<string, string> = {
  president: "President",
  all: "All",
  reader: "Reader",
  deacon: "Deacon",
};

const POSITION_LABELS: Record<string, string> = {
  OLD_TESTAMENT: "Old Testament",
  PSALM: "Psalm",
  EPISTLE: "Epistle",
  GOSPEL: "Gospel",
  CANTICLE: "Canticle",
};

function textBlockToParagraphs(block: LiturgicalTextBlock, _accent: string): Paragraph[] {
  if (block.speaker === "rubric") {
    return [
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: block.text, italics: true, size: 18, font: "Times New Roman", color: "6B5D4D" }),
        ],
      }),
    ];
  }

  const label = SPEAKER_LABELS[block.speaker];
  const isCongregational = block.speaker === "all";
  const paragraphs: Paragraph[] = [];

  if (label) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 20 },
        children: [
          new TextRun({ text: label, italics: true, size: 18, font: "Times New Roman", color: "6B5D4D" }),
        ],
      })
    );
  }

  paragraphs.push(
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: block.text,
          bold: isCongregational,
          size: 20,
          font: "Times New Roman",
        }),
      ],
    })
  );

  return paragraphs;
}

function musicSlotToParagraph(slot: MusicSlotEntry, _accent: string): Paragraph {
  const label = (MUSIC_SLOT_LABELS as Record<string, string>)[slot.slotType] || slot.label;
  const runs: TextRun[] = [
    new TextRun({ text: `${label}: `, bold: true, size: 20, font: "Times New Roman" }),
  ];

  let displayValue = slot.value;
  if (slot.hymn) {
    displayValue = `${slot.hymn.book} ${slot.hymn.number} — ${slot.hymn.firstLine}`;
    if (slot.hymn.tuneName) displayValue += ` (${slot.hymn.tuneName})`;
  } else if (slot.anthem) {
    displayValue = `${slot.anthem.title} — ${slot.anthem.composer}`;
  } else if (slot.massSetting) {
    displayValue = `${slot.massSetting.name} — ${slot.massSetting.composer}`;
  } else if (slot.canticleSetting) {
    displayValue = `${slot.canticleSetting.name} — ${slot.canticleSetting.composer}`;
  } else if (slot.responsesSetting) {
    displayValue = `${slot.responsesSetting.name} — ${slot.responsesSetting.composer}`;
  }

  runs.push(new TextRun({ text: displayValue, size: 20, font: "Times New Roman" }));
  if (slot.notes) {
    runs.push(new TextRun({ text: ` (${slot.notes})`, italics: true, size: 18, font: "Times New Roman", color: "6B5D4D" }));
  }

  return new Paragraph({ spacing: { after: 60 }, children: runs });
}

function buildBookletSection(data: BookletServiceSheetData): Paragraph[] {
  const accent = accentColourDocx(data.colour, data.templateLayout.accentColourOverride);
  const children: Paragraph[] = [];
  const resolved = resolveTemplate(data);

  // Header
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: data.churchName, bold: true, size: 28, font: "Times New Roman" })],
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: SERVICE_TYPE_DISPLAY[data.serviceType] || data.serviceType,
          bold: true, size: 36, font: "Times New Roman",
        }),
      ],
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: data.liturgicalName, size: 22, font: "Times New Roman" })],
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: data.date + (data.time ? ` at ${data.time}` : ""),
          size: 22, font: "Times New Roman", color: "6B5D4D",
        }),
      ],
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: accent } },
      children: [
        new TextRun({ text: `${data.season} — ${data.colour}`, size: 18, font: "Times New Roman", color: accent }),
      ],
    })
  );

  // Walk resolved sections
  for (const rs of resolved) {
    // Major section divider
    if (rs.section.majorSection) {
      children.push(
        new Paragraph({
          spacing: { before: 300, after: 100 },
          alignment: AlignmentType.CENTER,
          border: {
            top: { style: BorderStyle.SINGLE, size: 2, color: accent },
            bottom: { style: BorderStyle.SINGLE, size: 2, color: accent },
          },
          children: [
            new TextRun({
              text: rs.section.majorSection,
              bold: true, size: 22, font: "Times New Roman", color: accent,
            }),
          ],
        })
      );
    }

    // Section title
    if (rs.section.title) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: accent } },
          children: [
            new TextRun({ text: rs.section.title, bold: true, size: 22, font: "Times New Roman" }),
          ],
        })
      );
    }

    // Text blocks with speaker attribution
    for (const block of rs.resolvedBlocks) {
      children.push(...textBlockToParagraphs(block, accent));
    }

    // Reading
    if (rs.reading) {
      const posLabel = POSITION_LABELS[rs.reading.position] || rs.reading.position;
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: `${posLabel}: `, italics: true, size: 20, font: "Times New Roman" }),
            new TextRun({ text: rs.reading.reference, size: 20, font: "Times New Roman" }),
          ],
        })
      );
      if (data.includeReadingText && rs.reading.text) {
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({ text: rs.reading.text, size: 20, font: "Times New Roman" }),
            ],
          })
        );
      }
    }

    // Music slot
    if (rs.musicSlot) {
      children.push(musicSlotToParagraph(rs.musicSlot, accent));
    }
  }

  // Footer
  const footerParts = ["Generated by Precentor — Church Music Planner"];
  if (data.templateLayout.ccliNotice && data.ccliNumber) {
    footerParts.push(`CCLI Licence No. ${data.ccliNumber}`);
  }
  children.push(
    new Paragraph({
      spacing: { before: 400 },
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: accent } },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: footerParts.join("  |  "),
          size: 16, font: "Times New Roman", color: "6B5D4D",
        }),
      ],
    })
  );

  return children;
}

function buildSummarySection(data: SummaryServiceSheetData): Paragraph[] {
  const accent = accentColourDocx(data.colour, data.templateLayout.accentColourOverride);
  const children: Paragraph[] = [];

  // Header
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: data.churchName, bold: true, size: 28, font: "Times New Roman" })],
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: SERVICE_TYPE_DISPLAY[data.serviceType] || data.serviceType,
          bold: true, size: 36, font: "Times New Roman",
        }),
      ],
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: data.liturgicalName, size: 22, font: "Times New Roman" })],
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: data.date + (data.time ? ` at ${data.time}` : ""),
          size: 22, font: "Times New Roman", color: "6B5D4D",
        }),
      ],
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: accent } },
      children: [
        new TextRun({ text: `${data.season} — ${data.colour}`, size: 18, font: "Times New Roman", color: accent }),
      ],
    })
  );

  // Collect
  if (data.collect) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: accent } },
        children: [new TextRun({ text: "Collect", bold: true, size: 24, font: "Times New Roman" })],
      })
    );
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: data.collect, italics: true, size: 20, font: "Times New Roman" })],
      })
    );
  }

  // Readings
  if (data.readings.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: accent } },
        children: [new TextRun({ text: "Readings", bold: true, size: 24, font: "Times New Roman" })],
      })
    );
    for (const reading of data.readings) {
      const posLabel = POSITION_LABELS[reading.position] || reading.position;
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: `${posLabel}: `, italics: true, size: 20, font: "Times New Roman" }),
            new TextRun({ text: reading.reference, size: 20, font: "Times New Roman" }),
          ],
        })
      );
    }
    children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  }

  // Music
  if (data.musicSlots.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: accent } },
        children: [new TextRun({ text: "Music", bold: true, size: 24, font: "Times New Roman" })],
      })
    );
    for (const slot of data.musicSlots) {
      children.push(musicSlotToParagraph(slot, accent));
    }
  }

  // Footer
  children.push(
    new Paragraph({
      spacing: { before: 400 },
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: accent } },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Generated by Precentor — Church Music Planner",
          size: 16, font: "Times New Roman", color: "6B5D4D",
        }),
      ],
    })
  );

  return children;
}

// ─── New typed DOCX generators ───────────────────────────────────

export async function generateBookletDocx(
  data: BookletServiceSheetData
): Promise<Buffer> {
  const doc = new Document({
    sections: [{ children: buildBookletSection(data) }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function generateSummaryDocx(
  data: SummaryServiceSheetData
): Promise<Buffer> {
  const doc = new Document({
    sections: [{ children: buildSummarySection(data) }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function generateMultiBookletDocx(
  sheets: BookletServiceSheetData[]
): Promise<Buffer> {
  const doc = new Document({
    sections: sheets.map((data) => ({
      children: buildBookletSection(data),
    })),
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

export async function generateMultiSummaryDocx(
  sheets: SummaryServiceSheetData[]
): Promise<Buffer> {
  const doc = new Document({
    sections: sheets.map((data) => ({
      children: buildSummarySection(data),
    })),
  });
  return Buffer.from(await Packer.toBuffer(doc));
}
