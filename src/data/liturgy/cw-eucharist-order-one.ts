// Common Worship Holy Communion Order One — full liturgical template
// Source: Church of England Common Worship (2000)

import type { ServiceTemplate } from "./types";
import {
  PRAYER_OF_PREPARATION,
  CONFESSION_CW,
  GLORIA_IN_EXCELSIS,
  NICENE_CREED,
  LORDS_PRAYER_CW,
} from "./shared";

export const CW_EUCHARIST_ORDER_ONE: ServiceTemplate = {
  serviceType: "SUNG_EUCHARIST",
  rite: "Common Worship Order One",
  sections: [
    // ═══════════════════════════════════════════════════════════════
    // THE GATHERING
    // ═══════════════════════════════════════════════════════════════
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
      blocks: PRAYER_OF_PREPARATION,
    },
    {
      id: "gathering.confession",
      title: "Prayers of Penitence",
      blocks: CONFESSION_CW,
      allowOverride: true,
    },
    {
      id: "gathering.gloria",
      title: "Gloria in Excelsis",
      blocks: [
        { speaker: "rubric", text: "The Gloria is sung." },
        ...GLORIA_IN_EXCELSIS,
      ],
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

    // ═══════════════════════════════════════════════════════════════
    // THE LITURGY OF THE WORD
    // ═══════════════════════════════════════════════════════════════
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
      placeholder: "reading-nt",
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
      blocks: [
        { speaker: "rubric", text: "All stand." },
        ...NICENE_CREED,
      ],
    },
    {
      id: "word.intercessions",
      title: "Prayers of Intercession",
      blocks: [
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
      ],
      allowOverride: true,
    },

    // ═══════════════════════════════════════════════════════════════
    // THE LITURGY OF THE SACRAMENT
    // ═══════════════════════════════════════════════════════════════
    {
      id: "sacrament.peace",
      title: "The Peace",
      majorSection: "THE LITURGY OF THE SACRAMENT",
      blocks: [
        { speaker: "rubric", text: "All stand." },
        { speaker: "president", text: "The peace of the Lord be always with you" },
        { speaker: "all", text: "and also with you." },
        { speaker: "rubric", text: "We may offer one another a sign of peace." },
      ],
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
      blocks: [
        { speaker: "president", text: "Yours, Lord, is the greatness, the power, the glory, the splendour, and the majesty; for everything in heaven and on earth is yours." },
        { speaker: "all", text: "All things come from you, and of your own do we give you." },
      ],
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
      blocks: LORDS_PRAYER_CW,
    },
    {
      id: "sacrament.breaking-of-bread",
      title: "Breaking of the Bread",
      blocks: [
        { speaker: "president", text: "We break this bread to share in the body of Christ." },
        { speaker: "all", text: "Though we are many, we are one body, because we all share in one bread." },
      ],
    },
    {
      id: "sacrament.agnus-dei",
      title: "Agnus Dei",
      blocks: [
        { speaker: "rubric", text: "The Agnus Dei is sung." },
        {
          speaker: "all",
          text: `Lamb of God,
you take away the sin of the world,
have mercy on us.

Lamb of God,
you take away the sin of the world,
have mercy on us.

Lamb of God,
you take away the sin of the world,
grant us peace.`,
        },
      ],
      musicSlotType: "MASS_SETTING_AGNUS",
    },
    {
      id: "sacrament.invitation",
      title: "Giving of Communion",
      blocks: [
        { speaker: "president", text: "Draw near with faith. Receive the body of our Lord Jesus Christ which he gave for you, and his blood which he shed for you. Eat and drink in remembrance that he died for you, and feed on him in your hearts by faith with thanksgiving." },
        { speaker: "all", text: "Amen." },
        {
          speaker: "rubric",
          text: "The president and people receive communion. Those who wish to receive a blessing are welcome to come forward.",
        },
      ],
      allowOverride: true,
    },
    {
      id: "sacrament.communion-anthem",
      title: "Anthem",
      blocks: [
        { speaker: "rubric", text: "During the distribution, the choir sings the anthem." },
      ],
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
      blocks: [
        { speaker: "rubric", text: "Silence is kept." },
      ],
      placeholder: "post-communion",
    },
    {
      id: "sacrament.post-communion-common",
      title: "",
      blocks: [
        {
          speaker: "all",
          text: `Almighty God,
we thank you for feeding us
with the body and blood of your Son Jesus Christ.
Through him we offer you our souls and bodies
to be a living sacrifice.
Send us out
in the power of your Spirit
to live and work
to your praise and glory.
Amen.`,
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // THE DISMISSAL
    // ═══════════════════════════════════════════════════════════════
    {
      id: "dismissal.final-hymn",
      title: "Final Hymn",
      majorSection: "THE DISMISSAL",
      blocks: [
        { speaker: "rubric", text: "All stand." },
      ],
      musicSlotType: "HYMN",
    },
    {
      id: "dismissal.blessing",
      title: "The Blessing",
      blocks: [
        {
          speaker: "president",
          text: "The peace of God, which passes all understanding, keep your hearts and minds in the knowledge and love of God, and of his Son Jesus Christ our Lord; and the blessing of God almighty, the Father, the Son, and the Holy Spirit, be among you and remain with you always.",
        },
        { speaker: "all", text: "Amen." },
      ],
      allowOverride: true,
    },
    {
      id: "dismissal.dismissal",
      title: "The Dismissal",
      blocks: [
        { speaker: "deacon", text: "Go in peace to love and serve the Lord." },
        { speaker: "all", text: "In the name of Christ. Amen." },
      ],
    },
    {
      id: "dismissal.organ-voluntary",
      title: "Organ Voluntary",
      blocks: [],
      musicSlotType: "ORGAN_VOLUNTARY_POST",
      optional: true,
    },
  ],
};
