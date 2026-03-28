// Book of Common Prayer — Evening Prayer (Evensong)
// Source: 1662 Book of Common Prayer

import type { ServiceTemplate } from "./types";
import {
  LORDS_PRAYER_BCP,
  APOSTLES_CREED,
  MAGNIFICAT_TEXT,
  NUNC_DIMITTIS_TEXT,
} from "./shared";

export const BCP_EVENSONG: ServiceTemplate = {
  serviceType: "CHORAL_EVENSONG",
  rite: "BCP Evening Prayer",
  sections: [
    // ═══════════════════════════════════════════════════════════════
    // THE INTRODUCTORY RITE
    // ═══════════════════════════════════════════════════════════════
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
      blocks: [
        { speaker: "rubric", text: "All stand as the choir and clergy process." },
      ],
      musicSlotType: "HYMN",
      optional: true,
    },
    {
      id: "evensong.sentences",
      title: "Opening Sentences",
      blocks: [
        {
          speaker: "president",
          text: "Dearly beloved brethren, the Scripture moveth us in sundry places to acknowledge and confess our manifold sins and wickedness; and that we should not dissemble nor cloke them before the face of Almighty God our heavenly Father; but confess them with an humble, lowly, penitent, and obedient heart; to the end that we may obtain forgiveness of the same, by his infinite goodness and mercy.",
        },
        {
          speaker: "president",
          text: "And although we ought at all times humbly to acknowledge our sins before God; yet ought we most chiefly so to do, when we assemble and meet together to render thanks for the great benefits that we have received at his hands, to set forth his most worthy praise, to hear his most holy Word, and to ask those things which are requisite and necessary, as well for the body as the soul.",
        },
        {
          speaker: "president",
          text: "Wherefore I pray and beseech you, as many as are here present, to accompany me with a pure heart, and humble voice, unto the throne of the heavenly grace, saying after me:",
        },
      ],
      allowOverride: true,
    },
    {
      id: "evensong.confession",
      title: "A General Confession",
      blocks: [
        { speaker: "rubric", text: "All kneel." },
        {
          speaker: "all",
          text: `Almighty and most merciful Father,
We have erred, and strayed from thy ways like lost sheep,
We have followed too much the devices and desires of our own hearts,
We have offended against thy holy laws,
We have left undone those things which we ought to have done,
And we have done those things which we ought not to have done,
And there is no health in us.
But thou, O Lord, have mercy upon us miserable offenders;
Spare thou them, O God, which confess their faults,
Restore thou them that are penitent,
According to thy promises declared unto mankind in Christ Jesu our Lord;
And grant, O most merciful Father, for his sake,
That we may hereafter live a godly, righteous, and sober life,
To the glory of thy holy Name.
Amen.`,
        },
      ],
    },
    {
      id: "evensong.absolution",
      title: "The Absolution",
      blocks: [
        {
          speaker: "president",
          text: "Almighty God, the Father of our Lord Jesus Christ, who desireth not the death of a sinner, but rather that he may turn from his wickedness, and live; and hath given power, and commandment, to his Ministers, to declare and pronounce to his people, being penitent, the Absolution and Remission of their sins: He pardoneth and absolveth all them that truly repent, and unfeignedly believe his holy Gospel. Wherefore let us beseech him to grant us true repentance, and his Holy Spirit, that those things may please him, which we do at this present; and that the rest of our life hereafter may be pure, and holy; so that at the last we may come to his eternal joy; through Jesus Christ our Lord.",
        },
        { speaker: "all", text: "Amen." },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // THE OFFICE
    // ═══════════════════════════════════════════════════════════════
    {
      id: "evensong.lords-prayer",
      title: "The Lord's Prayer",
      majorSection: "THE OFFICE",
      blocks: LORDS_PRAYER_BCP,
    },
    {
      id: "evensong.preces",
      title: "Preces",
      blocks: [
        { speaker: "rubric", text: "All stand." },
        { speaker: "president", text: "O Lord, open thou our lips." },
        { speaker: "all", text: "And our mouth shall shew forth thy praise." },
        { speaker: "president", text: "O God, make speed to save us." },
        { speaker: "all", text: "O Lord, make haste to help us." },
        { speaker: "president", text: "Glory be to the Father, and to the Son, and to the Holy Ghost;" },
        { speaker: "all", text: "As it was in the beginning, is now, and ever shall be, world without end. Amen." },
        { speaker: "president", text: "Praise ye the Lord." },
        { speaker: "all", text: "The Lord's Name be praised." },
      ],
      musicSlotType: "RESPONSES",
    },
    {
      id: "evensong.psalm",
      title: "The Psalm",
      blocks: [
        { speaker: "rubric", text: "All sit. The appointed Psalm(s) are sung." },
      ],
      musicSlotType: "PSALM",
      placeholder: "reading-psalm",
    },
    {
      id: "evensong.first-lesson",
      title: "The First Lesson",
      blocks: [
        { speaker: "rubric", text: "All sit." },
      ],
      placeholder: "reading-ot",
    },
    {
      id: "evensong.magnificat",
      title: "Magnificat",
      blocks: [
        { speaker: "rubric", text: "All stand." },
        ...MAGNIFICAT_TEXT,
      ],
      musicSlotType: "CANTICLE_MAGNIFICAT",
    },
    {
      id: "evensong.second-lesson",
      title: "The Second Lesson",
      blocks: [
        { speaker: "rubric", text: "All sit." },
      ],
      placeholder: "reading-nt",
    },
    {
      id: "evensong.nunc-dimittis",
      title: "Nunc Dimittis",
      blocks: [
        { speaker: "rubric", text: "All stand." },
        ...NUNC_DIMITTIS_TEXT,
      ],
      musicSlotType: "CANTICLE_NUNC_DIMITTIS",
    },

    // ═══════════════════════════════════════════════════════════════
    // THE CREED AND PRAYERS
    // ═══════════════════════════════════════════════════════════════
    {
      id: "evensong.creed",
      title: "The Apostles' Creed",
      majorSection: "THE CREED AND PRAYERS",
      blocks: APOSTLES_CREED,
    },
    {
      id: "evensong.lesser-litany",
      title: "The Lesser Litany",
      blocks: [
        { speaker: "rubric", text: "All kneel." },
        { speaker: "president", text: "The Lord be with you." },
        { speaker: "all", text: "And with thy spirit." },
        { speaker: "president", text: "Let us pray." },
        { speaker: "president", text: "Lord, have mercy upon us." },
        { speaker: "all", text: "Christ, have mercy upon us." },
        { speaker: "president", text: "Lord, have mercy upon us." },
      ],
    },
    {
      id: "evensong.lords-prayer-2",
      title: "The Lord's Prayer",
      blocks: LORDS_PRAYER_BCP,
    },
    {
      id: "evensong.responses",
      title: "The Responses",
      blocks: [
        { speaker: "president", text: "O Lord, shew thy mercy upon us." },
        { speaker: "all", text: "And grant us thy salvation." },
        { speaker: "president", text: "O Lord, save the King." },
        { speaker: "all", text: "And mercifully hear us when we call upon thee." },
        { speaker: "president", text: "Endue thy Ministers with righteousness." },
        { speaker: "all", text: "And make thy chosen people joyful." },
        { speaker: "president", text: "O Lord, save thy people." },
        { speaker: "all", text: "And bless thine inheritance." },
        { speaker: "president", text: "Give peace in our time, O Lord." },
        { speaker: "all", text: "Because there is none other that fighteth for us, but only thou, O God." },
        { speaker: "president", text: "O God, make clean our hearts within us." },
        { speaker: "all", text: "And take not thy Holy Spirit from us." },
      ],
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
      blocks: [
        {
          speaker: "president",
          text: "O God, from whom all holy desires, all good counsels, and all just works do proceed; Give unto thy servants that peace which the world cannot give; that both our hearts may be set to obey thy commandments, and also that by thee we being defended from the fear of our enemies may pass our time in rest and quietness; through the merits of Jesus Christ our Saviour. Amen.",
        },
      ],
    },
    {
      id: "evensong.collect-aid",
      title: "The Third Collect, for Aid against all Perils",
      blocks: [
        {
          speaker: "president",
          text: "Lighten our darkness, we beseech thee, O Lord; and by thy great mercy defend us from all perils and dangers of this night; for the love of thy only Son, our Saviour, Jesus Christ. Amen.",
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // THE CONCLUSION
    // ═══════════════════════════════════════════════════════════════
    {
      id: "evensong.anthem",
      title: "Anthem",
      majorSection: "THE CONCLUSION",
      blocks: [
        { speaker: "rubric", text: "All sit. The choir sings the anthem." },
      ],
      musicSlotType: "ANTHEM",
      optional: true,
    },
    {
      id: "evensong.intercessions",
      title: "Prayers",
      blocks: [
        { speaker: "rubric", text: "Intercessions and thanksgivings may be offered." },
      ],
      optional: true,
      allowOverride: true,
    },
    {
      id: "evensong.hymn",
      title: "Hymn",
      blocks: [
        { speaker: "rubric", text: "All stand." },
      ],
      musicSlotType: "HYMN",
    },
    {
      id: "evensong.blessing",
      title: "The Blessing",
      blocks: [
        {
          speaker: "president",
          text: "The peace of God, which passeth all understanding, keep your hearts and minds in the knowledge and love of God, and of his Son Jesus Christ our Lord: And the Blessing of God Almighty, the Father, the Son, and the Holy Ghost, be amongst you and remain with you always.",
        },
        { speaker: "all", text: "Amen." },
      ],
      allowOverride: true,
    },
    {
      id: "evensong.organ-voluntary-post",
      title: "Organ Voluntary",
      blocks: [],
      musicSlotType: "ORGAN_VOLUNTARY_POST",
      optional: true,
    },
  ],
};
