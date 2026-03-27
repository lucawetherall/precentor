/**
 * Seed the database with liturgical texts extracted from the TypeScript source files.
 * Covers creeds, confessions, prayers, canticles, responses, greetings, and blessings
 * from both Common Worship (CW) and Book of Common Prayer (BCP) rites.
 *
 * Idempotent: uses onConflictDoUpdate keyed on `key`.
 *
 * Usage: npm run db:seed-texts
 */

import { db } from "@/lib/db";
import { liturgicalTexts } from "@/lib/db/schema-liturgy";

// ─── Block type ──────────────────────────────────────────────
interface TextBlock {
  speaker: string;
  text: string;
}

// ─── Shared text blocks (mirrors src/data/liturgy/shared.ts) ─

const GLORIA_PATRI: TextBlock[] = [
  {
    speaker: "all",
    text: `Glory be to the Father, and to the Son,\nand to the Holy Ghost;\nas it was in the beginning, is now, and ever shall be,\nworld without end. Amen.`,
  },
];

const LORDS_PRAYER_CW: TextBlock[] = [
  { speaker: "rubric", text: "As our Saviour taught us, so we pray" },
  {
    speaker: "all",
    text: `Our Father in heaven,\nhallowed be your name,\nyour kingdom come,\nyour will be done,\non earth as in heaven.\nGive us today our daily bread.\nForgive us our sins\nas we forgive those who sin against us.\nLead us not into temptation\nbut deliver us from evil.\nFor the kingdom, the power,\nand the glory are yours\nnow and for ever.\nAmen.`,
  },
];

const LORDS_PRAYER_BCP: TextBlock[] = [
  {
    speaker: "all",
    text: `Our Father, which art in heaven,\nhallowed be thy name;\nthy kingdom come;\nthy will be done,\nin earth as it is in heaven.\nGive us this day our daily bread.\nAnd forgive us our trespasses,\nas we forgive them that trespass against us.\nAnd lead us not into temptation;\nbut deliver us from evil.\nFor thine is the kingdom,\nthe power, and the glory,\nfor ever and ever.\nAmen.`,
  },
];

const NICENE_CREED: TextBlock[] = [
  { speaker: "rubric", text: "All stand." },
  {
    speaker: "all",
    text: `We believe in one God,\nthe Father, the Almighty,\nmaker of heaven and earth,\nof all that is,\nseen and unseen.\n\nWe believe in one Lord, Jesus Christ,\nthe only Son of God,\neternally begotten of the Father,\nGod from God, Light from Light,\ntrue God from true God,\nbegotten, not made,\nof one Being with the Father;\nthrough him all things were made.\nFor us and for our salvation he came down from heaven,\nwas incarnate from the Holy Spirit and the Virgin Mary\nand was made man.\nFor our sake he was crucified under Pontius Pilate;\nhe suffered death and was buried.\nOn the third day he rose again\nin accordance with the Scriptures;\nhe ascended into heaven\nand is seated at the right hand of the Father.\nHe will come again in glory to judge the living and the dead,\nand his kingdom will have no end.\n\nWe believe in the Holy Spirit,\nthe Lord, the giver of life,\nwho proceeds from the Father and the Son,\nwho with the Father and the Son is worshipped and glorified,\nwho has spoken through the prophets.\nWe believe in one holy catholic and apostolic Church.\nWe acknowledge one baptism for the forgiveness of sins.\nWe look for the resurrection of the dead,\nand the life of the world to come.\nAmen.`,
  },
];

const APOSTLES_CREED: TextBlock[] = [
  { speaker: "rubric", text: "All stand and turn to face East." },
  {
    speaker: "all",
    text: `I believe in God the Father almighty,\nmaker of heaven and earth:\nand in Jesus Christ his only Son our Lord,\nwho was conceived by the Holy Ghost,\nborn of the Virgin Mary,\nsuffered under Pontius Pilate,\nwas crucified, dead, and buried.\nHe descended into hell;\nthe third day he rose again from the dead;\nhe ascended into heaven,\nand sitteth on the right hand of God the Father almighty;\nfrom thence he shall come to judge the quick and the dead.\nI believe in the Holy Ghost;\nthe holy catholic Church;\nthe communion of saints;\nthe forgiveness of sins;\nthe resurrection of the body,\nand the life everlasting.\nAmen.`,
  },
];

const PRAYER_OF_PREPARATION: TextBlock[] = [
  {
    speaker: "all",
    text: `Almighty God,\nto whom all hearts are open,\nall desires known,\nand from whom no secrets are hidden:\ncleanse the thoughts of our hearts\nby the inspiration of your Holy Spirit,\nthat we may perfectly love you,\nand worthily magnify your holy name;\nthrough Christ our Lord.\nAmen.`,
  },
];

const CONFESSION_CW: TextBlock[] = [
  {
    speaker: "president",
    text: "God so loved the world that he gave his only Son Jesus Christ to save us from our sins, to be our advocate in heaven, and to bring us to eternal life. Let us confess our sins in penitence and faith, firmly resolved to keep God\u2019s commandments and to live in love and peace with all.",
  },
  { speaker: "rubric", text: "Silence is kept." },
  {
    speaker: "all",
    text: `Almighty God, our heavenly Father,\nwe have sinned against you\nand against our neighbour\nin thought and word and deed,\nthrough negligence, through weakness,\nthrough our own deliberate fault.\nWe are truly sorry\nand repent of all our sins.\nFor the sake of your Son Jesus Christ,\nwho died for us,\nforgive us all that is past\nand grant that we may serve you in newness of life\nto the glory of your name.\nAmen.`,
  },
  {
    speaker: "president",
    text: `Almighty God,\nwho forgives all who truly repent,\nhave mercy upon you,\npardon and deliver you from all your sins,\nconfirm and strengthen you in all goodness,\nand keep you in life eternal;\nthrough Jesus Christ our Lord.`,
  },
  { speaker: "all", text: "Amen." },
];

const GLORIA_IN_EXCELSIS: TextBlock[] = [
  {
    speaker: "all",
    text: `Glory to God in the highest,\nand peace to his people on earth.\n\nLord God, heavenly King,\nalmighty God and Father,\nwe worship you, we give you thanks,\nwe praise you for your glory.\n\nLord Jesus Christ, only Son of the Father,\nLord God, Lamb of God,\nyou take away the sin of the world:\nhave mercy on us;\nyou are seated at the right hand of the Father:\nreceive our prayer.\n\nFor you alone are the Holy One,\nyou alone are the Lord,\nyou alone are the Most High, Jesus Christ,\nwith the Holy Spirit,\nin the glory of God the Father.\nAmen.`,
  },
];

const MAGNIFICAT_TEXT: TextBlock[] = [
  { speaker: "rubric", text: "All stand." },
  {
    speaker: "all",
    text: `My soul doth magnify the Lord :\n  and my spirit hath rejoiced in God my Saviour.\nFor he hath regarded :\n  the lowliness of his handmaiden.\nFor behold, from henceforth :\n  all generations shall call me blessed.\nFor he that is mighty hath magnified me :\n  and holy is his Name.\nAnd his mercy is on them that fear him :\n  throughout all generations.\nHe hath shewed strength with his arm :\n  he hath scattered the proud in the imagination of their hearts.\nHe hath put down the mighty from their seat :\n  and hath exalted the humble and meek.\nHe hath filled the hungry with good things :\n  and the rich he hath sent empty away.\nHe remembering his mercy hath holpen his servant Israel :\n  as he promised to our forefathers, Abraham and his seed, for ever.`,
  },
  ...GLORIA_PATRI,
];

const NUNC_DIMITTIS_TEXT: TextBlock[] = [
  { speaker: "rubric", text: "All stand." },
  {
    speaker: "all",
    text: `Lord, now lettest thou thy servant depart in peace :\n  according to thy word.\nFor mine eyes have seen :\n  thy salvation;\nWhich thou hast prepared :\n  before the face of all people;\nTo be a light to lighten the Gentiles :\n  and to be the glory of thy people Israel.`,
  },
  ...GLORIA_PATRI,
];

// ─── Texts extracted from cw-eucharist-order-one.ts ──────────

const CW_GREETING: TextBlock[] = [
  { speaker: "president", text: "In the name of the Father, and of the Son, and of the Holy Spirit." },
  { speaker: "all", text: "Amen." },
  { speaker: "president", text: "The Lord be with you" },
  { speaker: "all", text: "and also with you." },
];

const CW_INTERCESSIONS: TextBlock[] = [
  { speaker: "rubric", text: "All sit or kneel." },
  {
    speaker: "rubric",
    text: "The prayers usually include these concerns and may follow this or another form.",
  },
  { speaker: "reader", text: "Lord, in your mercy" },
  { speaker: "all", text: "hear our prayer." },
  { speaker: "rubric", text: "And at the end:" },
  { speaker: "reader", text: "Merciful Father," },
  {
    speaker: "all",
    text: "accept these prayers for the sake of your Son, our Saviour Jesus Christ. Amen.",
  },
];

const CW_PEACE: TextBlock[] = [
  { speaker: "rubric", text: "All stand." },
  { speaker: "president", text: "The peace of the Lord be always with you" },
  { speaker: "all", text: "and also with you." },
  { speaker: "rubric", text: "We may offer one another a sign of peace." },
];

const CW_PREPARATION_OF_TABLE: TextBlock[] = [
  { speaker: "president", text: "Yours, Lord, is the greatness, the power, the glory, the splendour, and the majesty; for everything in heaven and on earth is yours." },
  { speaker: "all", text: "All things come from you, and of your own do we give you." },
];

const CW_BREAKING_OF_BREAD: TextBlock[] = [
  { speaker: "president", text: "We break this bread to share in the body of Christ." },
  { speaker: "all", text: "Though we are many, we are one body, because we all share in one bread." },
];

const CW_AGNUS_DEI: TextBlock[] = [
  { speaker: "rubric", text: "The Agnus Dei is sung." },
  {
    speaker: "all",
    text: `Lamb of God,\nyou take away the sin of the world,\nhave mercy on us.\n\nLamb of God,\nyou take away the sin of the world,\nhave mercy on us.\n\nLamb of God,\nyou take away the sin of the world,\ngrant us peace.`,
  },
];

const CW_INVITATION_TO_COMMUNION: TextBlock[] = [
  { speaker: "president", text: "Draw near with faith. Receive the body of our Lord Jesus Christ which he gave for you, and his blood which he shed for you. Eat and drink in remembrance that he died for you, and feed on him in your hearts by faith with thanksgiving." },
  { speaker: "all", text: "Amen." },
  {
    speaker: "rubric",
    text: "The president and people receive communion. Those who wish to receive a blessing are welcome to come forward.",
  },
];

const CW_POST_COMMUNION_PRAYER: TextBlock[] = [
  {
    speaker: "all",
    text: `Almighty God,\nwe thank you for feeding us\nwith the body and blood of your Son Jesus Christ.\nThrough him we offer you our souls and bodies\nto be a living sacrifice.\nSend us out\nin the power of your Spirit\nto live and work\nto your praise and glory.\nAmen.`,
  },
];

const CW_BLESSING: TextBlock[] = [
  {
    speaker: "president",
    text: "The peace of God, which passes all understanding, keep your hearts and minds in the knowledge and love of God, and of his Son Jesus Christ our Lord; and the blessing of God almighty, the Father, the Son, and the Holy Spirit, be among you and remain with you always.",
  },
  { speaker: "all", text: "Amen." },
];

const CW_DISMISSAL: TextBlock[] = [
  { speaker: "deacon", text: "Go in peace to love and serve the Lord." },
  { speaker: "all", text: "In the name of Christ. Amen." },
];

// ─── Texts extracted from bcp-evensong.ts ────────────────────

const BCP_OPENING_SENTENCES: TextBlock[] = [
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
];

const BCP_CONFESSION: TextBlock[] = [
  { speaker: "rubric", text: "All kneel." },
  {
    speaker: "all",
    text: `Almighty and most merciful Father,\nWe have erred, and strayed from thy ways like lost sheep,\nWe have followed too much the devices and desires of our own hearts,\nWe have offended against thy holy laws,\nWe have left undone those things which we ought to have done,\nAnd we have done those things which we ought not to have done,\nAnd there is no health in us.\nBut thou, O Lord, have mercy upon us miserable offenders;\nSpare thou them, O God, which confess their faults,\nRestore thou them that are penitent,\nAccording to thy promises declared unto mankind in Christ Jesu our Lord;\nAnd grant, O most merciful Father, for his sake,\nThat we may hereafter live a godly, righteous, and sober life,\nTo the glory of thy holy Name.\nAmen.`,
  },
];

const BCP_ABSOLUTION: TextBlock[] = [
  {
    speaker: "president",
    text: "Almighty God, the Father of our Lord Jesus Christ, who desireth not the death of a sinner, but rather that he may turn from his wickedness, and live; and hath given power, and commandment, to his Ministers, to declare and pronounce to his people, being penitent, the Absolution and Remission of their sins: He pardoneth and absolveth all them that truly repent, and unfeignedly believe his holy Gospel. Wherefore let us beseech him to grant us true repentance, and his Holy Spirit, that those things may please him, which we do at this present; and that the rest of our life hereafter may be pure, and holy; so that at the last we may come to his eternal joy; through Jesus Christ our Lord.",
  },
  { speaker: "all", text: "Amen." },
];

const BCP_PRECES: TextBlock[] = [
  { speaker: "rubric", text: "All stand." },
  { speaker: "president", text: "O Lord, open thou our lips." },
  { speaker: "all", text: "And our mouth shall shew forth thy praise." },
  { speaker: "president", text: "O God, make speed to save us." },
  { speaker: "all", text: "O Lord, make haste to help us." },
  { speaker: "president", text: "Glory be to the Father, and to the Son, and to the Holy Ghost;" },
  { speaker: "all", text: "As it was in the beginning, is now, and ever shall be, world without end. Amen." },
  { speaker: "president", text: "Praise ye the Lord." },
  { speaker: "all", text: "The Lord's Name be praised." },
];

const BCP_LESSER_LITANY: TextBlock[] = [
  { speaker: "rubric", text: "All kneel." },
  { speaker: "president", text: "The Lord be with you." },
  { speaker: "all", text: "And with thy spirit." },
  { speaker: "president", text: "Let us pray." },
  { speaker: "president", text: "Lord, have mercy upon us." },
  { speaker: "all", text: "Christ, have mercy upon us." },
  { speaker: "president", text: "Lord, have mercy upon us." },
];

const BCP_RESPONSES: TextBlock[] = [
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
];

const BCP_COLLECT_PEACE: TextBlock[] = [
  {
    speaker: "president",
    text: "O God, from whom all holy desires, all good counsels, and all just works do proceed; Give unto thy servants that peace which the world cannot give; that both our hearts may be set to obey thy commandments, and also that by thee we being defended from the fear of our enemies may pass our time in rest and quietness; through the merits of Jesus Christ our Saviour. Amen.",
  },
];

const BCP_COLLECT_AID: TextBlock[] = [
  {
    speaker: "president",
    text: "Lighten our darkness, we beseech thee, O Lord; and by thy great mercy defend us from all perils and dangers of this night; for the love of thy only Son, our Saviour, Jesus Christ. Amen.",
  },
];

const BCP_BLESSING: TextBlock[] = [
  {
    speaker: "president",
    text: "The peace of God, which passeth all understanding, keep your hearts and minds in the knowledge and love of God, and of his Son Jesus Christ our Lord: And the Blessing of God Almighty, the Father, the Son, and the Holy Ghost, be amongst you and remain with you always.",
  },
  { speaker: "all", text: "Amen." },
];

// ─── Master texts array ───────────────────────────────────────

const TEXTS: {
  key: string;
  title: string;
  rite: "CW" | "BCP" | "COMMON";
  category: string;
  blocks: TextBlock[];
}[] = [
  // ── COMMON (shared across rites) ──
  {
    key: "gloria-patri",
    title: "Gloria Patri",
    rite: "COMMON",
    category: "prayer",
    blocks: GLORIA_PATRI,
  },

  // ── COMMON WORSHIP ──
  {
    key: "lords-prayer-cw",
    title: "The Lord\u2019s Prayer (Common Worship)",
    rite: "CW",
    category: "prayer",
    blocks: LORDS_PRAYER_CW,
  },
  {
    key: "nicene-creed",
    title: "The Nicene Creed",
    rite: "CW",
    category: "creed",
    blocks: NICENE_CREED,
  },
  {
    key: "prayer-of-preparation",
    title: "Prayer of Preparation",
    rite: "CW",
    category: "prayer",
    blocks: PRAYER_OF_PREPARATION,
  },
  {
    key: "confession-cw",
    title: "Prayers of Penitence (CW)",
    rite: "CW",
    category: "confession",
    blocks: CONFESSION_CW,
  },
  {
    key: "gloria-in-excelsis",
    title: "Gloria in Excelsis",
    rite: "CW",
    category: "prayer",
    blocks: GLORIA_IN_EXCELSIS,
  },
  {
    key: "greeting-cw",
    title: "The Greeting (CW)",
    rite: "CW",
    category: "greeting",
    blocks: CW_GREETING,
  },
  {
    key: "intercessions-cw",
    title: "Prayers of Intercession (CW)",
    rite: "CW",
    category: "prayer",
    blocks: CW_INTERCESSIONS,
  },
  {
    key: "peace-cw",
    title: "The Peace (CW)",
    rite: "CW",
    category: "greeting",
    blocks: CW_PEACE,
  },
  {
    key: "preparation-of-table-cw",
    title: "Preparation of the Table (CW)",
    rite: "CW",
    category: "prayer",
    blocks: CW_PREPARATION_OF_TABLE,
  },
  {
    key: "breaking-of-bread-cw",
    title: "Breaking of the Bread (CW)",
    rite: "CW",
    category: "rubric",
    blocks: CW_BREAKING_OF_BREAD,
  },
  {
    key: "agnus-dei",
    title: "Agnus Dei",
    rite: "CW",
    category: "prayer",
    blocks: CW_AGNUS_DEI,
  },
  {
    key: "invitation-to-communion-cw",
    title: "Giving of Communion (CW)",
    rite: "CW",
    category: "rubric",
    blocks: CW_INVITATION_TO_COMMUNION,
  },
  {
    key: "post-communion-prayer-cw",
    title: "Prayer after Communion (CW)",
    rite: "CW",
    category: "prayer",
    blocks: CW_POST_COMMUNION_PRAYER,
  },
  {
    key: "blessing-cw",
    title: "The Blessing (CW)",
    rite: "CW",
    category: "blessing",
    blocks: CW_BLESSING,
  },
  {
    key: "dismissal-cw",
    title: "The Dismissal (CW)",
    rite: "CW",
    category: "rubric",
    blocks: CW_DISMISSAL,
  },

  // ── BOOK OF COMMON PRAYER ──
  {
    key: "lords-prayer-bcp",
    title: "The Lord\u2019s Prayer (BCP)",
    rite: "BCP",
    category: "prayer",
    blocks: LORDS_PRAYER_BCP,
  },
  {
    key: "apostles-creed",
    title: "The Apostles\u2019 Creed",
    rite: "BCP",
    category: "creed",
    blocks: APOSTLES_CREED,
  },
  {
    key: "magnificat",
    title: "Magnificat",
    rite: "BCP",
    category: "canticle",
    blocks: MAGNIFICAT_TEXT,
  },
  {
    key: "nunc-dimittis",
    title: "Nunc Dimittis",
    rite: "BCP",
    category: "canticle",
    blocks: NUNC_DIMITTIS_TEXT,
  },
  {
    key: "opening-sentences-bcp",
    title: "Opening Sentences (BCP)",
    rite: "BCP",
    category: "rubric",
    blocks: BCP_OPENING_SENTENCES,
  },
  {
    key: "confession-bcp",
    title: "A General Confession (BCP)",
    rite: "BCP",
    category: "confession",
    blocks: BCP_CONFESSION,
  },
  {
    key: "absolution-bcp",
    title: "The Absolution (BCP)",
    rite: "BCP",
    category: "prayer",
    blocks: BCP_ABSOLUTION,
  },
  {
    key: "preces-bcp",
    title: "Preces",
    rite: "BCP",
    category: "response",
    blocks: BCP_PRECES,
  },
  {
    key: "lesser-litany-bcp",
    title: "The Lesser Litany",
    rite: "BCP",
    category: "response",
    blocks: BCP_LESSER_LITANY,
  },
  {
    key: "responses-bcp",
    title: "The Responses",
    rite: "BCP",
    category: "response",
    blocks: BCP_RESPONSES,
  },
  {
    key: "collect-peace-bcp",
    title: "The Second Collect, for Peace",
    rite: "BCP",
    category: "prayer",
    blocks: BCP_COLLECT_PEACE,
  },
  {
    key: "collect-aid-bcp",
    title: "The Third Collect, for Aid against all Perils",
    rite: "BCP",
    category: "prayer",
    blocks: BCP_COLLECT_AID,
  },
  {
    key: "blessing-bcp",
    title: "The Blessing (BCP)",
    rite: "BCP",
    category: "blessing",
    blocks: BCP_BLESSING,
  },
];

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding ${TEXTS.length} liturgical texts...`);

  for (const text of TEXTS) {
    await db
      .insert(liturgicalTexts)
      .values({
        key: text.key,
        title: text.title,
        rite: text.rite,
        category: text.category,
        blocks: text.blocks,
      })
      .onConflictDoUpdate({
        target: liturgicalTexts.key,
        set: {
          title: text.title,
          rite: text.rite,
          category: text.category,
          blocks: text.blocks,
          updatedAt: new Date(),
        },
      });

    console.log(`  ✓ ${text.key}`);
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
