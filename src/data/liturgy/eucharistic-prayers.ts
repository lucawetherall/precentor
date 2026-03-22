// Common Worship Eucharistic Prayers A–H
// Source: Church of England Common Worship (2000)

import type { LiturgicalSection, LiturgicalTextBlock } from "./types";

// ─── Shared dialogue: Sursum Corda ─────────────────────────────

const SURSUM_CORDA: LiturgicalTextBlock[] = [
  { speaker: "president", text: "The Lord be with you" },
  { speaker: "all", text: "and also with you." },
  { speaker: "president", text: "Lift up your hearts." },
  { speaker: "all", text: "We lift them to the Lord." },
  { speaker: "president", text: "Let us give thanks to the Lord our God." },
  { speaker: "all", text: "It is right to give thanks and praise." },
];

// ─── Shared: Sanctus & Benedictus ──────────────────────────────

const SANCTUS_BENEDICTUS: LiturgicalTextBlock[] = [
  {
    speaker: "all",
    text: `Holy, holy, holy Lord,
God of power and might,
heaven and earth are full of your glory.
Hosanna in the highest.
Blessed is he who comes in the name of the Lord.
Hosanna in the highest.`,
  },
];

// ─── Prayer A ──────────────────────────────────────────────────

const PRAYER_A_BLOCKS: LiturgicalTextBlock[] = [
  ...SURSUM_CORDA,
  {
    speaker: "president",
    text: "It is indeed right, it is our duty and our joy, at all times and in all places to give you thanks and praise, holy Father, heavenly King, almighty and eternal God, through Jesus Christ your Son our Lord.",
  },
  { speaker: "rubric", text: "A Proper Preface may be used (see pp. 306–309)." },
  {
    speaker: "president",
    text: "Therefore with angels and archangels, and with all the company of heaven, we proclaim your great and glorious name, for ever praising you and saying:",
  },
  ...SANCTUS_BENEDICTUS,
  {
    speaker: "president",
    text: `Accept our praises, heavenly Father,
through your Son our Saviour Jesus Christ,
and as we follow his example and obey his command,
grant that by the power of your Holy Spirit
these gifts of bread and wine
may be to us his body and his blood;

who, in the same night that he was betrayed,
took bread and gave you thanks;
he broke it and gave it to his disciples, saying:
Take, eat; this is my body which is given for you;
do this in remembrance of me.`,
  },
  {
    speaker: "president",
    text: `In the same way, after supper
he took the cup and gave you thanks;
he gave it to them, saying:
Drink this, all of you;
this is my blood of the new covenant,
which is shed for you and for many for the forgiveness of sins.
Do this, as often as you drink it,
in remembrance of me.`,
  },
  { speaker: "rubric", text: "One of the following acclamations is used:" },
  { speaker: "president", text: "Great is the mystery of faith:" },
  {
    speaker: "all",
    text: `Christ has died:
Christ is risen:
Christ will come again.`,
  },
  {
    speaker: "president",
    text: `Therefore, heavenly Father,
we remember his offering of himself
made once for all upon the cross;
we proclaim his mighty resurrection and glorious ascension;
we look for the coming of your kingdom,
and with this bread and this cup
we make the memorial of Christ your Son our Lord.`,
  },
  {
    speaker: "president",
    text: `Accept through him, our great high priest,
this our sacrifice of thanks and praise,
and as we eat and drink these holy gifts
in the presence of your divine majesty,
renew us by your Spirit,
inspire us with your love
and unite us in the body of your Son,
Jesus Christ our Lord.`,
  },
  {
    speaker: "president",
    text: "Through him, and with him, and in him, in the unity of the Holy Spirit, with all who stand before you in earth and heaven, we worship you, Father almighty, in songs of everlasting praise:",
  },
  {
    speaker: "all",
    text: "Blessing and honour and glory and power be yours for ever and ever. Amen.",
  },
];

// ─── Prayer B ──────────────────────────────────────────────────

const PRAYER_B_BLOCKS: LiturgicalTextBlock[] = [
  ...SURSUM_CORDA,
  {
    speaker: "president",
    text: "It is indeed right, it is our duty and our joy, at all times and in all places to give you thanks and praise, holy Father, heavenly King, almighty and eternal God, through Jesus Christ your Son our Lord.",
  },
  { speaker: "rubric", text: "A Proper Preface may be used." },
  {
    speaker: "president",
    text: "Therefore with angels and archangels, and with all the company of heaven, we proclaim your great and glorious name, for ever praising you and saying:",
  },
  ...SANCTUS_BENEDICTUS,
  {
    speaker: "president",
    text: `Lord, you are holy indeed, the source of all holiness;
grant that by the power of your Holy Spirit,
and according to your holy will,
these gifts of bread and wine
may be to us the body and blood of our Lord Jesus Christ;

who, in the same night that he was betrayed,
took bread and gave you thanks;
he broke it and gave it to his disciples, saying:
Take, eat; this is my body which is given for you;
do this in remembrance of me.`,
  },
  {
    speaker: "president",
    text: `In the same way, after supper
he took the cup and gave you thanks;
he gave it to them, saying:
Drink this, all of you;
this is my blood of the new covenant,
which is shed for you and for many for the forgiveness of sins.
Do this, as often as you drink it,
in remembrance of me.`,
  },
  { speaker: "president", text: "Great is the mystery of faith:" },
  {
    speaker: "all",
    text: `Christ has died:
Christ is risen:
Christ will come again.`,
  },
  {
    speaker: "president",
    text: `And so, Father, calling to mind his death on the cross,
his perfect sacrifice made once for the sins of the whole world;
rejoicing in his mighty resurrection and glorious ascension,
and looking for his coming in glory,
we celebrate this memorial of our redemption.
As we offer you this our sacrifice of praise and thanksgiving,
we bring before you this bread and this cup
and we thank you for counting us worthy
to stand in your presence and serve you.`,
  },
  {
    speaker: "president",
    text: `Send the Holy Spirit on your people
and gather into one in your kingdom
all who share this one bread and one cup,
so that we, in the company of all the saints,
may praise and glorify you for ever,
through Jesus Christ our Lord;`,
  },
  {
    speaker: "president",
    text: "by whom, and with whom, and in whom, in the unity of the Holy Spirit, all honour and glory be yours, almighty Father, for ever and ever.",
  },
  { speaker: "all", text: "Amen." },
];

// ─── Prayer C ──────────────────────────────────────────────────

const PRAYER_C_BLOCKS: LiturgicalTextBlock[] = [
  ...SURSUM_CORDA,
  {
    speaker: "president",
    text: "It is indeed right, it is our duty and our joy, at all times and in all places to give you thanks and praise, holy Father, heavenly King, almighty and eternal God, through Jesus Christ your Son our Lord.",
  },
  { speaker: "rubric", text: "A Proper Preface may be used." },
  {
    speaker: "president",
    text: "Therefore with angels and archangels, and with all the company of heaven, we proclaim your great and glorious name, for ever praising you and saying:",
  },
  ...SANCTUS_BENEDICTUS,
  {
    speaker: "president",
    text: `All glory to you, our heavenly Father,
who, in your tender mercy,
gave your only Son our Saviour Jesus Christ
to suffer death upon the cross for our redemption;
who made there by his one oblation of himself once offered
a full, perfect and sufficient sacrifice, oblation and satisfaction
for the sins of the whole world;
he instituted, and in his holy gospel commanded us to continue,
a perpetual memory of his precious death
until he comes again.`,
  },
  {
    speaker: "president",
    text: `Hear us, merciful Father, we humbly pray,
and grant that, by the power of your Holy Spirit,
we receiving these gifts of your creation, this bread and this wine,
according to your Son our Saviour Jesus Christ's holy institution,
in remembrance of his death and passion,
may be partakers of his most blessed body and blood;

who, in the same night that he was betrayed,
took bread and gave you thanks;
he broke it and gave it to his disciples, saying:
Take, eat; this is my body which is given for you;
do this in remembrance of me.`,
  },
  {
    speaker: "president",
    text: `In the same way, after supper
he took the cup and gave you thanks;
he gave it to them, saying:
Drink this, all of you;
this is my blood of the new covenant,
which is shed for you and for many for the forgiveness of sins.
Do this, as often as you drink it,
in remembrance of me.`,
  },
  { speaker: "president", text: "Great is the mystery of faith:" },
  {
    speaker: "all",
    text: `Christ has died:
Christ is risen:
Christ will come again.`,
  },
  {
    speaker: "president",
    text: `Therefore, Lord and heavenly Father,
in remembrance of the precious death and passion,
the mighty resurrection and glorious ascension
of your dear Son Jesus Christ,
we offer you through him this our sacrifice of praise and thanksgiving.`,
  },
  {
    speaker: "president",
    text: `Grant that by his merits and death,
and through faith in his blood,
we and all your Church may receive forgiveness of our sins
and all other benefits of his passion.
Although we are unworthy, through our manifold sins,
to offer you any sacrifice,
yet we pray that you will accept this
the duty and service that we owe.
Do not weigh our merits, but pardon our offences,
and fill us all who share in this holy communion
with your grace and heavenly blessing;`,
  },
  {
    speaker: "president",
    text: "through Jesus Christ our Lord, by whom, and with whom, and in whom, in the unity of the Holy Spirit, all honour and glory be yours, almighty Father, for ever and ever.",
  },
  { speaker: "all", text: "Amen." },
];

// ─── Prayer D ──────────────────────────────────────────────────

const PRAYER_D_BLOCKS: LiturgicalTextBlock[] = [
  ...SURSUM_CORDA,
  {
    speaker: "president",
    text: "It is indeed right, it is our duty and our joy, at all times and in all places to give you thanks and praise, holy Father, heavenly King, almighty and eternal God, through Jesus Christ your Son our Lord.",
  },
  { speaker: "rubric", text: "A Proper Preface may be used." },
  {
    speaker: "president",
    text: "Therefore with angels and archangels, and with all the company of heaven, we proclaim your great and glorious name, for ever praising you and saying:",
  },
  ...SANCTUS_BENEDICTUS,
  {
    speaker: "president",
    text: `We praise and bless you, loving Father,
through Jesus Christ, our Lord;
and as we obey his command,
send your Holy Spirit,
that broken bread and wine outpoured
may be for us the body and blood of your dear Son.`,
  },
  {
    speaker: "president",
    text: `On the night before he died he had supper with his friends
and, taking bread, he praised you.
He broke the bread, gave it to them and said:
Take, eat; this is my body which is given for you;
do this in remembrance of me.`,
  },
  {
    speaker: "president",
    text: `When supper was ended he took the cup of wine.
Again he praised you, gave it to them and said:
Drink this, all of you;
this is my blood of the new covenant,
which is shed for you and for many for the forgiveness of sins.
Do this, as often as you drink it, in remembrance of me.`,
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
    text: `Christ has died:
Christ is risen:
Christ will come again.`,
  },
  {
    speaker: "president",
    text: `Lord of all life,
help us to work together for that day
when your kingdom comes
and justice and mercy will be seen in all the earth.

Look with favour on your people,
gather us in your loving arms
and bring us with all the saints
to feast at your table in heaven.`,
  },
  {
    speaker: "president",
    text: "Through Christ, and with Christ, and in Christ, in the unity of the Holy Spirit, all honour and glory are yours, O loving Father, for ever and ever.",
  },
  { speaker: "all", text: "Amen." },
];

// ─── Prayer E ──────────────────────────────────────────────────

const PRAYER_E_BLOCKS: LiturgicalTextBlock[] = [
  ...SURSUM_CORDA,
  {
    speaker: "president",
    text: "It is indeed right, it is our duty and our joy, at all times and in all places to give you thanks and praise, holy Father, heavenly King, almighty and eternal God, through Jesus Christ your Son our Lord.",
  },
  { speaker: "rubric", text: "A Proper Preface may be used." },
  {
    speaker: "president",
    text: "Therefore with angels and archangels, and with all the company of heaven, we proclaim your great and glorious name, for ever praising you and saying:",
  },
  ...SANCTUS_BENEDICTUS,
  {
    speaker: "president",
    text: `We praise and bless you, loving Father,
through Jesus Christ, our Lord;
and as we obey his command,
send your Holy Spirit,
that broken bread and wine outpoured
may be for us the body and blood of your dear Son.`,
  },
  {
    speaker: "president",
    text: `On the night before he died he had supper with his friends
and, taking bread, he praised you.
He broke the bread, gave it to them and said:
Take, eat; this is my body which is given for you;
do this in remembrance of me.`,
  },
  {
    speaker: "president",
    text: `When supper was ended he took the cup of wine.
Again he praised you, gave it to them and said:
Drink this, all of you;
this is my blood of the new covenant,
which is shed for you and for many for the forgiveness of sins.
Do this, as often as you drink it, in remembrance of me.`,
  },
  { speaker: "president", text: "Jesus Christ is Lord:" },
  {
    speaker: "all",
    text: `Lord, by your cross and resurrection
you have set us free.
You are the Saviour of the world.`,
  },
  {
    speaker: "president",
    text: `And so, Father, calling to mind his death on the cross,
his perfect sacrifice made once for the sins of the whole world;
rejoicing in his mighty resurrection and glorious ascension,
and looking for his coming in glory,
we celebrate this memorial of our redemption.`,
  },
  {
    speaker: "president",
    text: `As we offer you this our sacrifice of praise and thanksgiving,
we bring before you this bread and this cup
and we thank you for counting us worthy
to stand in your presence and serve you.`,
  },
  {
    speaker: "president",
    text: `Send the Holy Spirit on your people
and gather into one in your kingdom
all who share this one bread and one cup,
so that we, in the company of all the saints,
may praise and glorify you for ever,
through Jesus Christ our Lord;`,
  },
  {
    speaker: "president",
    text: "by whom, and with whom, and in whom, in the unity of the Holy Spirit, all honour and glory be yours, almighty Father, for ever and ever.",
  },
  { speaker: "all", text: "Amen." },
];

// ─── Prayer F ──────────────────────────────────────────────────

const PRAYER_F_BLOCKS: LiturgicalTextBlock[] = [
  ...SURSUM_CORDA,
  {
    speaker: "president",
    text: "It is indeed right, it is our duty and our joy, at all times and in all places to give you thanks and praise, holy Father, heavenly King, almighty and eternal God, through Jesus Christ your Son our Lord.",
  },
  { speaker: "rubric", text: "A Proper Preface may be used." },
  {
    speaker: "president",
    text: "Therefore with angels and archangels, and with all the company of heaven, we proclaim your great and glorious name, for ever praising you and saying:",
  },
  ...SANCTUS_BENEDICTUS,
  {
    speaker: "president",
    text: "You are wonderful, Lord of all creation. Through your goodness you have given us the bread of life and the cup of salvation.",
  },
  { speaker: "all", text: "Jesus, Lamb of God, have mercy on us." },
  {
    speaker: "president",
    text: `You loved us before the foundation of the world. In your great mercy you gave your only-begotten Son, that all who trust in him might not be lost but have eternal life.`,
  },
  { speaker: "all", text: "Jesus, Lamb of God, have mercy on us." },
  {
    speaker: "president",
    text: `He became man, and shared in our suffering.
On the night before he died he took bread, gave you thanks and broke it.
He gave it to his disciples, saying:
Take, eat; this is my body which is given for you;
do this in remembrance of me.`,
  },
  { speaker: "all", text: "Jesus, Lamb of God, have mercy on us." },
  {
    speaker: "president",
    text: `In the same way, after supper
he took the cup and gave you thanks;
he gave it to them, saying:
Drink this, all of you;
this is my blood of the new covenant,
which is shed for you and for many for the forgiveness of sins.
Do this, as often as you drink it,
in remembrance of me.`,
  },
  { speaker: "all", text: "Jesus, Lamb of God, have mercy on us." },
  { speaker: "president", text: "Christ is the bread of life:" },
  {
    speaker: "all",
    text: "When we eat this bread and drink this cup, we proclaim your death, Lord Jesus, until you come in glory.",
  },
  {
    speaker: "president",
    text: `Therefore, heavenly Father,
in this sacrament of the suffering and death of your Son,
we now celebrate the wonder of your grace
and pray that through it
we may find forgiveness of our sins
and be filled with the Holy Spirit and live to your praise and glory;`,
  },
  {
    speaker: "president",
    text: "through Jesus Christ our Lord, by whom, and with whom, and in whom, in the unity of the Holy Spirit, all honour and glory be yours, almighty Father, for ever and ever.",
  },
  { speaker: "all", text: "Amen." },
];

// ─── Prayer G ──────────────────────────────────────────────────

const PRAYER_G_BLOCKS: LiturgicalTextBlock[] = [
  ...SURSUM_CORDA,
  {
    speaker: "president",
    text: `Blessed are you, Lord God,
our light and our salvation;
to you be glory and praise for ever.`,
  },
  {
    speaker: "president",
    text: `From the beginning you have created all things
and all your works echo the silent music of your praise.
In the fullness of time you made us in your image,
the crown of all creation.`,
  },
  {
    speaker: "president",
    text: `You give us breath and speech, that with angels and archangels
and all the powers of heaven
we may find a voice to sing your praise:`,
  },
  ...SANCTUS_BENEDICTUS,
  {
    speaker: "president",
    text: `How wonderful the work of your hands, O Lord.
As a mother tenderly gathers her children,
you embraced a people as your own.
When they turned away and rebelled
your love remained steadfast.`,
  },
  {
    speaker: "president",
    text: `From them you raised up Jesus our Saviour, born of Mary,
to be the living bread,
in whom all our hungers are satisfied.`,
  },
  {
    speaker: "president",
    text: `He offered his life for sinners,
and with a love stronger than death
he opened wide his arms on the cross.`,
  },
  {
    speaker: "president",
    text: `On the night before he died,
he came to supper with his friends
and, taking bread, he gave you thanks.
He broke it and gave it to them, saying:
Take, eat; this is my body which is given for you;
do this in remembrance of me.`,
  },
  {
    speaker: "president",
    text: `At the end of supper, taking the cup of wine,
he gave you thanks, and said:
Drink this, all of you; this is my blood of the new covenant,
which is shed for you and for many for the forgiveness of sins.
Do this, as often as you drink it, in remembrance of me.`,
  },
  { speaker: "president", text: "Great is the mystery of faith:" },
  {
    speaker: "all",
    text: `Christ has died:
Christ is risen:
Christ will come again.`,
  },
  {
    speaker: "president",
    text: `Father, we plead with confidence
his sacrifice made once for all upon the cross;
we remember his dying and rising in glory,
and we rejoice that he intercedes for us at your right hand.`,
  },
  {
    speaker: "president",
    text: `Pour out your Holy Spirit as we bring before you
these gifts of your creation;
may they be for us the body and blood of your dear Son.`,
  },
  {
    speaker: "president",
    text: `As we eat and drink these holy things in your presence,
form us in the likeness of Christ,
and build us into a living temple to your glory.`,
  },
  {
    speaker: "president",
    text: "Bring us at the last with all the saints to the vision of that eternal splendour for which you have created us; through Jesus Christ, our Lord, by whom, with whom, and in whom, with all who stand before you in earth and heaven, we worship you, Father almighty, in songs of everlasting praise:",
  },
  {
    speaker: "all",
    text: "Blessing and honour and glory and power be yours for ever and ever. Amen.",
  },
];

// ─── Prayer H ──────────────────────────────────────────────────

const PRAYER_H_BLOCKS: LiturgicalTextBlock[] = [
  ...SURSUM_CORDA,
  {
    speaker: "president",
    text: "It is right to praise you, Father, Lord of all creation; in your love you made us for yourself.",
  },
  {
    speaker: "president",
    text: "When we turned away you did not reject us, but came to meet us in your Son.",
  },
  { speaker: "all", text: "You embraced us as your children and welcomed us to sit and eat with you." },
  {
    speaker: "president",
    text: "In Christ you shared our life that we might live in him and he in us.",
  },
  { speaker: "all", text: "He opened his arms of love upon the cross and made for all the perfect sacrifice for sin." },
  {
    speaker: "president",
    text: `On the night he was betrayed,
at supper with his friends
he took bread, and gave you thanks;
he broke it and gave it to them, saying:
Take, eat; this is my body which is given for you;
do this in remembrance of me.`,
  },
  { speaker: "all", text: "Father, we do this in remembrance of him: his body is the bread of life." },
  {
    speaker: "president",
    text: `At the end of supper, taking the cup of wine,
he gave you thanks, and said:
Drink this, all of you; this is my blood of the new covenant,
which is shed for you and for many for the forgiveness of sins.
Do this, as often as you drink it, in remembrance of me.`,
  },
  { speaker: "all", text: "Christ is the bread of life. When we eat this bread and drink this cup, we proclaim your death, Lord Jesus, until you come in glory." },
  {
    speaker: "president",
    text: `Therefore, Father, remembering all that he has done for us,
we ask you to accept this our duty and service;
and as we eat and drink these holy things
in the presence of your divine majesty,
fill us with your grace and heavenly blessing
through Jesus Christ our Lord;`,
  },
  {
    speaker: "president",
    text: "through him, and with him, and in him, in the unity of the Holy Spirit, all honour and glory are yours, now and for ever.",
  },
  { speaker: "all", text: "Amen." },
];

// ─── Sections for template injection ──────────────────────────

function prayerSection(id: string, title: string, blocks: LiturgicalTextBlock[]): LiturgicalSection {
  return {
    id,
    title,
    blocks,
  };
}

export const EUCHARISTIC_PRAYER_A = prayerSection("eucharistic-prayer-a", "Eucharistic Prayer A", PRAYER_A_BLOCKS);
export const EUCHARISTIC_PRAYER_B = prayerSection("eucharistic-prayer-b", "Eucharistic Prayer B", PRAYER_B_BLOCKS);
export const EUCHARISTIC_PRAYER_C = prayerSection("eucharistic-prayer-c", "Eucharistic Prayer C", PRAYER_C_BLOCKS);
export const EUCHARISTIC_PRAYER_D = prayerSection("eucharistic-prayer-d", "Eucharistic Prayer D", PRAYER_D_BLOCKS);
export const EUCHARISTIC_PRAYER_E = prayerSection("eucharistic-prayer-e", "Eucharistic Prayer E", PRAYER_E_BLOCKS);
export const EUCHARISTIC_PRAYER_F = prayerSection("eucharistic-prayer-f", "Eucharistic Prayer F", PRAYER_F_BLOCKS);
export const EUCHARISTIC_PRAYER_G = prayerSection("eucharistic-prayer-g", "Eucharistic Prayer G", PRAYER_G_BLOCKS);
export const EUCHARISTIC_PRAYER_H = prayerSection("eucharistic-prayer-h", "Eucharistic Prayer H", PRAYER_H_BLOCKS);

/** Lookup map for eucharistic prayers by key (A–H) */
export const EUCHARISTIC_PRAYERS: Record<string, LiturgicalSection> = {
  A: EUCHARISTIC_PRAYER_A,
  B: EUCHARISTIC_PRAYER_B,
  C: EUCHARISTIC_PRAYER_C,
  D: EUCHARISTIC_PRAYER_D,
  E: EUCHARISTIC_PRAYER_E,
  F: EUCHARISTIC_PRAYER_F,
  G: EUCHARISTIC_PRAYER_G,
  H: EUCHARISTIC_PRAYER_H,
};
