/**
 * Seed the database with CW Eucharistic Prayers A–H.
 * Reads block data from src/data/liturgy/eucharistic-prayers.ts.
 *
 * Idempotent: uses onConflictDoUpdate keyed on `eucharisticPrayers.key`.
 *
 * Usage: npm run db:seed-prayers
 */

import "dotenv/config";
import { db } from "@/lib/db";
import { eucharisticPrayers } from "@/lib/db/schema-base";

// ─── Prayer metadata ──────────────────────────────────────────

const PRAYERS: {
  key: string;
  name: string;
  description: string;
  blocks: { speaker: string; text: string }[];
}[] = [
  {
    key: "cw-a",
    name: "Prayer A",
    description:
      "Traditional structure closely based on the 1662 prayer. Extended preface varies by season.",
    blocks: [
      { speaker: "president", text: "The Lord be with you" },
      { speaker: "all", text: "and also with you." },
      { speaker: "president", text: "Lift up your hearts." },
      { speaker: "all", text: "We lift them to the Lord." },
      { speaker: "president", text: "Let us give thanks to the Lord our God." },
      { speaker: "all", text: "It is right to give thanks and praise." },
      {
        speaker: "president",
        text: "It is indeed right, it is our duty and our joy, at all times and in all places to give you thanks and praise, holy Father, heavenly King, almighty and eternal God, through Jesus Christ your Son our Lord.",
      },
      { speaker: "rubric", text: "A Proper Preface may be used (see pp. 306–309)." },
      {
        speaker: "president",
        text: "Therefore with angels and archangels, and with all the company of heaven, we proclaim your great and glorious name, for ever praising you and saying:",
      },
      {
        speaker: "all",
        text: "Holy, holy, holy Lord,\nGod of power and might,\nheaven and earth are full of your glory.\nHosanna in the highest.\nBlessed is he who comes in the name of the Lord.\nHosanna in the highest.",
      },
      {
        speaker: "president",
        text: "Accept our praises, heavenly Father,\nthrough your Son our Saviour Jesus Christ,\nand as we follow his example and obey his command,\ngrant that by the power of your Holy Spirit\nthese gifts of bread and wine\nmay be to us his body and his blood;\n\nwho, in the same night that he was betrayed,\ntook bread and gave you thanks;\nhe broke it and gave it to his disciples, saying:\nTake, eat; this is my body which is given for you;\ndo this in remembrance of me.",
      },
      {
        speaker: "president",
        text: "In the same way, after supper\nhe took the cup and gave you thanks;\nhe gave it to them, saying:\nDrink this, all of you;\nthis is my blood of the new covenant,\nwhich is shed for you and for many for the forgiveness of sins.\nDo this, as often as you drink it,\nin remembrance of me.",
      },
      { speaker: "rubric", text: "One of the following acclamations is used:" },
      { speaker: "president", text: "Great is the mystery of faith:" },
      {
        speaker: "all",
        text: "Christ has died:\nChrist is risen:\nChrist will come again.",
      },
      {
        speaker: "president",
        text: "Therefore, heavenly Father,\nwe remember his offering of himself\nmade once for all upon the cross;\nwe proclaim his mighty resurrection and glorious ascension;\nwe look for the coming of your kingdom,\nand with this bread and this cup\nwe make the memorial of Christ your Son our Lord.",
      },
      {
        speaker: "president",
        text: "Accept through him, our great high priest,\nthis our sacrifice of thanks and praise,\nand as we eat and drink these holy gifts\nin the presence of your divine majesty,\nrenew us by your Spirit,\ninspire us with your love\nand unite us in the body of your Son,\nJesus Christ our Lord.",
      },
      {
        speaker: "president",
        text: "Through him, and with him, and in him, in the unity of the Holy Spirit, with all who stand before you in earth and heaven, we worship you, Father almighty, in songs of everlasting praise:",
      },
      {
        speaker: "all",
        text: "Blessing and honour and glory and power be yours for ever and ever. Amen.",
      },
    ],
  },
  {
    key: "cw-b",
    name: "Prayer B",
    description:
      "Short, congregational responses throughout. Most commonly used in parish worship.",
    blocks: [
      { speaker: "president", text: "The Lord be with you" },
      { speaker: "all", text: "and also with you." },
      { speaker: "president", text: "Lift up your hearts." },
      { speaker: "all", text: "We lift them to the Lord." },
      { speaker: "president", text: "Let us give thanks to the Lord our God." },
      { speaker: "all", text: "It is right to give thanks and praise." },
      {
        speaker: "president",
        text: "It is indeed right, it is our duty and our joy, at all times and in all places to give you thanks and praise, holy Father, heavenly King, almighty and eternal God, through Jesus Christ your Son our Lord.",
      },
      { speaker: "rubric", text: "A Proper Preface may be used." },
      {
        speaker: "president",
        text: "Therefore with angels and archangels, and with all the company of heaven, we proclaim your great and glorious name, for ever praising you and saying:",
      },
      {
        speaker: "all",
        text: "Holy, holy, holy Lord,\nGod of power and might,\nheaven and earth are full of your glory.\nHosanna in the highest.\nBlessed is he who comes in the name of the Lord.\nHosanna in the highest.",
      },
      {
        speaker: "president",
        text: "Lord, you are holy indeed, the source of all holiness;\ngrant that by the power of your Holy Spirit,\nand according to your holy will,\nthese gifts of bread and wine\nmay be to us the body and blood of our Lord Jesus Christ;\n\nwho, in the same night that he was betrayed,\ntook bread and gave you thanks;\nhe broke it and gave it to his disciples, saying:\nTake, eat; this is my body which is given for you;\ndo this in remembrance of me.",
      },
      {
        speaker: "president",
        text: "In the same way, after supper\nhe took the cup and gave you thanks;\nhe gave it to them, saying:\nDrink this, all of you;\nthis is my blood of the new covenant,\nwhich is shed for you and for many for the forgiveness of sins.\nDo this, as often as you drink it,\nin remembrance of me.",
      },
      { speaker: "president", text: "Great is the mystery of faith:" },
      {
        speaker: "all",
        text: "Christ has died:\nChrist is risen:\nChrist will come again.",
      },
      {
        speaker: "president",
        text: "And so, Father, calling to mind his death on the cross,\nhis perfect sacrifice made once for the sins of the whole world;\nrejoicing in his mighty resurrection and glorious ascension,\nand looking for his coming in glory,\nwe celebrate this memorial of our redemption.\nAs we offer you this our sacrifice of praise and thanksgiving,\nwe bring before you this bread and this cup\nand we thank you for counting us worthy\nto stand in your presence and serve you.",
      },
      {
        speaker: "president",
        text: "Send the Holy Spirit on your people\nand gather into one in your kingdom\nall who share this one bread and one cup,\nso that we, in the company of all the saints,\nmay praise and glorify you for ever,\nthrough Jesus Christ our Lord;",
      },
      {
        speaker: "president",
        text: "by whom, and with whom, and in whom, in the unity of the Holy Spirit, all honour and glory be yours, almighty Father, for ever and ever.",
      },
      { speaker: "all", text: "Amen." },
    ],
  },
  {
    key: "cw-c",
    name: "Prayer C",
    description:
      "Responsive format — congregation and president alternate throughout.",
    blocks: [
      { speaker: "president", text: "The Lord be with you" },
      { speaker: "all", text: "and also with you." },
      { speaker: "president", text: "Lift up your hearts." },
      { speaker: "all", text: "We lift them to the Lord." },
      { speaker: "president", text: "Let us give thanks to the Lord our God." },
      { speaker: "all", text: "It is right to give thanks and praise." },
      {
        speaker: "president",
        text: "It is indeed right, it is our duty and our joy, at all times and in all places to give you thanks and praise, holy Father, heavenly King, almighty and eternal God, through Jesus Christ your Son our Lord.",
      },
      { speaker: "rubric", text: "A Proper Preface may be used." },
      {
        speaker: "president",
        text: "Therefore with angels and archangels, and with all the company of heaven, we proclaim your great and glorious name, for ever praising you and saying:",
      },
      {
        speaker: "all",
        text: "Holy, holy, holy Lord,\nGod of power and might,\nheaven and earth are full of your glory.\nHosanna in the highest.\nBlessed is he who comes in the name of the Lord.\nHosanna in the highest.",
      },
      {
        speaker: "president",
        text: "All glory to you, our heavenly Father,\nwho, in your tender mercy,\ngave your only Son our Saviour Jesus Christ\nto suffer death upon the cross for our redemption;\nwho made there by his one oblation of himself once offered\na full, perfect and sufficient sacrifice, oblation and satisfaction\nfor the sins of the whole world;\nhe instituted, and in his holy gospel commanded us to continue,\na perpetual memory of his precious death\nuntil he comes again.",
      },
      {
        speaker: "president",
        text: "Hear us, merciful Father, we humbly pray,\nand grant that, by the power of your Holy Spirit,\nwe receiving these gifts of your creation, this bread and this wine,\naccording to your Son our Saviour Jesus Christ's holy institution,\nin remembrance of his death and passion,\nmay be partakers of his most blessed body and blood;\n\nwho, in the same night that he was betrayed,\ntook bread and gave you thanks;\nhe broke it and gave it to his disciples, saying:\nTake, eat; this is my body which is given for you;\ndo this in remembrance of me.",
      },
      {
        speaker: "president",
        text: "In the same way, after supper\nhe took the cup and gave you thanks;\nhe gave it to them, saying:\nDrink this, all of you;\nthis is my blood of the new covenant,\nwhich is shed for you and for many for the forgiveness of sins.\nDo this, as often as you drink it,\nin remembrance of me.",
      },
      { speaker: "president", text: "Great is the mystery of faith:" },
      {
        speaker: "all",
        text: "Christ has died:\nChrist is risen:\nChrist will come again.",
      },
      {
        speaker: "president",
        text: "Therefore, Lord and heavenly Father,\nin remembrance of the precious death and passion,\nthe mighty resurrection and glorious ascension\nof your dear Son Jesus Christ,\nwe offer you through him this our sacrifice of praise and thanksgiving.",
      },
      {
        speaker: "president",
        text: "Grant that by his merits and death,\nand through faith in his blood,\nwe and all your Church may receive forgiveness of our sins\nand all other benefits of his passion.\nAlthough we are unworthy, through our manifold sins,\nto offer you any sacrifice,\nyet we pray that you will accept this\nthe duty and service that we owe.\nDo not weigh our merits, but pardon our offences,\nand fill us all who share in this holy communion\nwith your grace and heavenly blessing;",
      },
      {
        speaker: "president",
        text: "through Jesus Christ our Lord, by whom, and with whom, and in whom, in the unity of the Holy Spirit, all honour and glory be yours, almighty Father, for ever and ever.",
      },
      { speaker: "all", text: "Amen." },
    ],
  },
  {
    key: "cw-d",
    name: "Prayer D",
    description: "Rich imagery of creation and salvation history.",
    blocks: [
      { speaker: "president", text: "The Lord be with you" },
      { speaker: "all", text: "and also with you." },
      { speaker: "president", text: "Lift up your hearts." },
      { speaker: "all", text: "We lift them to the Lord." },
      { speaker: "president", text: "Let us give thanks to the Lord our God." },
      { speaker: "all", text: "It is right to give thanks and praise." },
      {
        speaker: "president",
        text: "It is indeed right, it is our duty and our joy, at all times and in all places to give you thanks and praise, holy Father, heavenly King, almighty and eternal God, through Jesus Christ your Son our Lord.",
      },
      { speaker: "rubric", text: "A Proper Preface may be used." },
      {
        speaker: "president",
        text: "Therefore with angels and archangels, and with all the company of heaven, we proclaim your great and glorious name, for ever praising you and saying:",
      },
      {
        speaker: "all",
        text: "Holy, holy, holy Lord,\nGod of power and might,\nheaven and earth are full of your glory.\nHosanna in the highest.\nBlessed is he who comes in the name of the Lord.\nHosanna in the highest.",
      },
      {
        speaker: "president",
        text: "We praise and bless you, loving Father,\nthrough Jesus Christ, our Lord;\nand as we obey his command,\nsend your Holy Spirit,\nthat broken bread and wine outpoured\nmay be for us the body and blood of your dear Son.",
      },
      {
        speaker: "president",
        text: "On the night before he died he had supper with his friends\nand, taking bread, he praised you.\nHe broke the bread, gave it to them and said:\nTake, eat; this is my body which is given for you;\ndo this in remembrance of me.",
      },
      {
        speaker: "president",
        text: "When supper was ended he took the cup of wine.\nAgain he praised you, gave it to them and said:\nDrink this, all of you;\nthis is my blood of the new covenant,\nwhich is shed for you and for many for the forgiveness of sins.\nDo this, as often as you drink it, in remembrance of me.",
      },
      {
        speaker: "president",
        text: "So, Father, we remember all that Jesus did, in him we plead with confidence his sacrifice made once for all upon the cross.",
      },
      {
        speaker: "president",
        text: "Bringing before you the bread of life and cup of salvation, we proclaim his death and resurrection until he comes in glory.",
      },
      { speaker: "president", text: "Great is the mystery of faith:" },
      {
        speaker: "all",
        text: "Christ has died:\nChrist is risen:\nChrist will come again.",
      },
      {
        speaker: "president",
        text: "Lord of all life,\nhelp us to work together for that day\nwhen your kingdom comes\nand justice and mercy will be seen in all the earth.\n\nLook with favour on your people,\ngather us in your loving arms\nand bring us with all the saints\nto feast at your table in heaven.",
      },
      {
        speaker: "president",
        text: "Through Christ, and with Christ, and in Christ, in the unity of the Holy Spirit, all honour and glory are yours, O loving Father, for ever and ever.",
      },
      { speaker: "all", text: "Amen." },
    ],
  },
  {
    key: "cw-e",
    name: "Prayer E",
    description: "Shortest CW prayer. Direct and accessible.",
    blocks: [
      { speaker: "president", text: "The Lord be with you" },
      { speaker: "all", text: "and also with you." },
      { speaker: "president", text: "Lift up your hearts." },
      { speaker: "all", text: "We lift them to the Lord." },
      { speaker: "president", text: "Let us give thanks to the Lord our God." },
      { speaker: "all", text: "It is right to give thanks and praise." },
      {
        speaker: "president",
        text: "It is indeed right, it is our duty and our joy, at all times and in all places to give you thanks and praise, holy Father, heavenly King, almighty and eternal God, through Jesus Christ your Son our Lord.",
      },
      { speaker: "rubric", text: "A Proper Preface may be used." },
      {
        speaker: "president",
        text: "Therefore with angels and archangels, and with all the company of heaven, we proclaim your great and glorious name, for ever praising you and saying:",
      },
      {
        speaker: "all",
        text: "Holy, holy, holy Lord,\nGod of power and might,\nheaven and earth are full of your glory.\nHosanna in the highest.\nBlessed is he who comes in the name of the Lord.\nHosanna in the highest.",
      },
      {
        speaker: "president",
        text: "We praise and bless you, loving Father,\nthrough Jesus Christ, our Lord;\nand as we obey his command,\nsend your Holy Spirit,\nthat broken bread and wine outpoured\nmay be for us the body and blood of your dear Son.",
      },
      {
        speaker: "president",
        text: "On the night before he died he had supper with his friends\nand, taking bread, he praised you.\nHe broke the bread, gave it to them and said:\nTake, eat; this is my body which is given for you;\ndo this in remembrance of me.",
      },
      {
        speaker: "president",
        text: "When supper was ended he took the cup of wine.\nAgain he praised you, gave it to them and said:\nDrink this, all of you;\nthis is my blood of the new covenant,\nwhich is shed for you and for many for the forgiveness of sins.\nDo this, as often as you drink it, in remembrance of me.",
      },
      { speaker: "president", text: "Jesus Christ is Lord:" },
      {
        speaker: "all",
        text: "Lord, by your cross and resurrection\nyou have set us free.\nYou are the Saviour of the world.",
      },
      {
        speaker: "president",
        text: "And so, Father, calling to mind his death on the cross,\nhis perfect sacrifice made once for the sins of the whole world;\nrejoicing in his mighty resurrection and glorious ascension,\nand looking for his coming in glory,\nwe celebrate this memorial of our redemption.",
      },
      {
        speaker: "president",
        text: "As we offer you this our sacrifice of praise and thanksgiving,\nwe bring before you this bread and this cup\nand we thank you for counting us worthy\nto stand in your presence and serve you.",
      },
      {
        speaker: "president",
        text: "Send the Holy Spirit on your people\nand gather into one in your kingdom\nall who share this one bread and one cup,\nso that we, in the company of all the saints,\nmay praise and glorify you for ever,\nthrough Jesus Christ our Lord;",
      },
      {
        speaker: "president",
        text: "by whom, and with whom, and in whom, in the unity of the Holy Spirit, all honour and glory be yours, almighty Father, for ever and ever.",
      },
      { speaker: "all", text: "Amen." },
    ],
  },
  {
    key: "cw-f",
    name: "Prayer F",
    description: "Emphasises the work of the Holy Spirit.",
    blocks: [
      { speaker: "president", text: "The Lord be with you" },
      { speaker: "all", text: "and also with you." },
      { speaker: "president", text: "Lift up your hearts." },
      { speaker: "all", text: "We lift them to the Lord." },
      { speaker: "president", text: "Let us give thanks to the Lord our God." },
      { speaker: "all", text: "It is right to give thanks and praise." },
      {
        speaker: "president",
        text: "It is indeed right, it is our duty and our joy, at all times and in all places to give you thanks and praise, holy Father, heavenly King, almighty and eternal God, through Jesus Christ your Son our Lord.",
      },
      { speaker: "rubric", text: "A Proper Preface may be used." },
      {
        speaker: "president",
        text: "Therefore with angels and archangels, and with all the company of heaven, we proclaim your great and glorious name, for ever praising you and saying:",
      },
      {
        speaker: "all",
        text: "Holy, holy, holy Lord,\nGod of power and might,\nheaven and earth are full of your glory.\nHosanna in the highest.\nBlessed is he who comes in the name of the Lord.\nHosanna in the highest.",
      },
      {
        speaker: "president",
        text: "You are wonderful, Lord of all creation. Through your goodness you have given us the bread of life and the cup of salvation.",
      },
      { speaker: "all", text: "Jesus, Lamb of God, have mercy on us." },
      {
        speaker: "president",
        text: "You loved us before the foundation of the world. In your great mercy you gave your only-begotten Son, that all who trust in him might not be lost but have eternal life.",
      },
      { speaker: "all", text: "Jesus, Lamb of God, have mercy on us." },
      {
        speaker: "president",
        text: "He became man, and shared in our suffering.\nOn the night before he died he took bread, gave you thanks and broke it.\nHe gave it to his disciples, saying:\nTake, eat; this is my body which is given for you;\ndo this in remembrance of me.",
      },
      { speaker: "all", text: "Jesus, Lamb of God, have mercy on us." },
      {
        speaker: "president",
        text: "In the same way, after supper\nhe took the cup and gave you thanks;\nhe gave it to them, saying:\nDrink this, all of you;\nthis is my blood of the new covenant,\nwhich is shed for you and for many for the forgiveness of sins.\nDo this, as often as you drink it,\nin remembrance of me.",
      },
      { speaker: "all", text: "Jesus, Lamb of God, have mercy on us." },
      { speaker: "president", text: "Christ is the bread of life:" },
      {
        speaker: "all",
        text: "When we eat this bread and drink this cup, we proclaim your death, Lord Jesus, until you come in glory.",
      },
      {
        speaker: "president",
        text: "Therefore, heavenly Father,\nin this sacrament of the suffering and death of your Son,\nwe now celebrate the wonder of your grace\nand pray that through it\nwe may find forgiveness of our sins\nand be filled with the Holy Spirit and live to your praise and glory;",
      },
      {
        speaker: "president",
        text: "through Jesus Christ our Lord, by whom, and with whom, and in whom, in the unity of the Holy Spirit, all honour and glory be yours, almighty Father, for ever and ever.",
      },
      { speaker: "all", text: "Amen." },
    ],
  },
  {
    key: "cw-g",
    name: "Prayer G",
    description: "Extended narrative of salvation.",
    blocks: [
      { speaker: "president", text: "The Lord be with you" },
      { speaker: "all", text: "and also with you." },
      { speaker: "president", text: "Lift up your hearts." },
      { speaker: "all", text: "We lift them to the Lord." },
      { speaker: "president", text: "Let us give thanks to the Lord our God." },
      { speaker: "all", text: "It is right to give thanks and praise." },
      {
        speaker: "president",
        text: "Blessed are you, Lord God,\nour light and our salvation;\nto you be glory and praise for ever.",
      },
      {
        speaker: "president",
        text: "From the beginning you have created all things\nand all your works echo the silent music of your praise.\nIn the fullness of time you made us in your image,\nthe crown of all creation.",
      },
      {
        speaker: "president",
        text: "You give us breath and speech, that with angels and archangels\nand all the powers of heaven\nwe may find a voice to sing your praise:",
      },
      {
        speaker: "all",
        text: "Holy, holy, holy Lord,\nGod of power and might,\nheaven and earth are full of your glory.\nHosanna in the highest.\nBlessed is he who comes in the name of the Lord.\nHosanna in the highest.",
      },
      {
        speaker: "president",
        text: "How wonderful the work of your hands, O Lord.\nAs a mother tenderly gathers her children,\nyou embraced a people as your own.\nWhen they turned away and rebelled\nyour love remained steadfast.",
      },
      {
        speaker: "president",
        text: "From them you raised up Jesus our Saviour, born of Mary,\nto be the living bread,\nin whom all our hungers are satisfied.",
      },
      {
        speaker: "president",
        text: "He offered his life for sinners,\nand with a love stronger than death\nhe opened wide his arms on the cross.",
      },
      {
        speaker: "president",
        text: "On the night before he died,\nhe came to supper with his friends\nand, taking bread, he gave you thanks.\nHe broke it and gave it to them, saying:\nTake, eat; this is my body which is given for you;\ndo this in remembrance of me.",
      },
      {
        speaker: "president",
        text: "At the end of supper, taking the cup of wine,\nhe gave you thanks, and said:\nDrink this, all of you; this is my blood of the new covenant,\nwhich is shed for you and for many for the forgiveness of sins.\nDo this, as often as you drink it, in remembrance of me.",
      },
      { speaker: "president", text: "Great is the mystery of faith:" },
      {
        speaker: "all",
        text: "Christ has died:\nChrist is risen:\nChrist will come again.",
      },
      {
        speaker: "president",
        text: "Father, we plead with confidence\nhis sacrifice made once for all upon the cross;\nwe remember his dying and rising in glory,\nand we rejoice that he intercedes for us at your right hand.",
      },
      {
        speaker: "president",
        text: "Pour out your Holy Spirit as we bring before you\nthese gifts of your creation;\nmay they be for us the body and blood of your dear Son.",
      },
      {
        speaker: "president",
        text: "As we eat and drink these holy things in your presence,\nform us in the likeness of Christ,\nand build us into a living temple to your glory.",
      },
      {
        speaker: "president",
        text: "Bring us at the last with all the saints to the vision of that eternal splendour for which you have created us; through Jesus Christ, our Lord, by whom, with whom, and in whom, with all who stand before you in earth and heaven, we worship you, Father almighty, in songs of everlasting praise:",
      },
      {
        speaker: "all",
        text: "Blessing and honour and glory and power be yours for ever and ever. Amen.",
      },
    ],
  },
  {
    key: "cw-h",
    name: "Prayer H",
    description: "Suitable for use with children. Simple language and structure.",
    blocks: [
      { speaker: "president", text: "The Lord be with you" },
      { speaker: "all", text: "and also with you." },
      { speaker: "president", text: "Lift up your hearts." },
      { speaker: "all", text: "We lift them to the Lord." },
      { speaker: "president", text: "Let us give thanks to the Lord our God." },
      { speaker: "all", text: "It is right to give thanks and praise." },
      {
        speaker: "president",
        text: "It is right to praise you, Father, Lord of all creation; in your love you made us for yourself.",
      },
      {
        speaker: "president",
        text: "When we turned away you did not reject us, but came to meet us in your Son.",
      },
      {
        speaker: "all",
        text: "You embraced us as your children and welcomed us to sit and eat with you.",
      },
      {
        speaker: "president",
        text: "In Christ you shared our life that we might live in him and he in us.",
      },
      {
        speaker: "all",
        text: "He opened his arms of love upon the cross and made for all the perfect sacrifice for sin.",
      },
      {
        speaker: "president",
        text: "On the night he was betrayed,\nat supper with his friends\nhe took bread, and gave you thanks;\nhe broke it and gave it to them, saying:\nTake, eat; this is my body which is given for you;\ndo this in remembrance of me.",
      },
      {
        speaker: "all",
        text: "Father, we do this in remembrance of him: his body is the bread of life.",
      },
      {
        speaker: "president",
        text: "At the end of supper, taking the cup of wine,\nhe gave you thanks, and said:\nDrink this, all of you; this is my blood of the new covenant,\nwhich is shed for you and for many for the forgiveness of sins.\nDo this, as often as you drink it, in remembrance of me.",
      },
      {
        speaker: "all",
        text: "Christ is the bread of life. When we eat this bread and drink this cup, we proclaim your death, Lord Jesus, until you come in glory.",
      },
      {
        speaker: "president",
        text: "Therefore, Father, remembering all that he has done for us,\nwe ask you to accept this our duty and service;\nand as we eat and drink these holy things\nin the presence of your divine majesty,\nfill us with your grace and heavenly blessing\nthrough Jesus Christ our Lord;",
      },
      {
        speaker: "president",
        text: "through him, and with him, and in him, in the unity of the Holy Spirit, all honour and glory are yours, now and for ever.",
      },
      { speaker: "all", text: "Amen." },
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding ${PRAYERS.length} eucharistic prayers...`);

  for (const prayer of PRAYERS) {
    await db
      .insert(eucharisticPrayers)
      .values({
        key: prayer.key,
        name: prayer.name,
        rite: "CW",
        description: prayer.description,
        blocks: prayer.blocks,
      })
      .onConflictDoUpdate({
        target: eucharisticPrayers.key,
        set: {
          name: prayer.name,
          rite: "CW",
          description: prayer.description,
          blocks: prayer.blocks,
        },
      });

    console.log(`  ✓ ${prayer.key}: ${prayer.name}`);
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
