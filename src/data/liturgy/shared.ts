// Shared liturgical texts used across multiple services

import type { LiturgicalTextBlock } from "./types";

// ─── The Lord's Prayer (Contemporary — Common Worship) ──────────

export const LORDS_PRAYER_CW: LiturgicalTextBlock[] = [
  { speaker: "rubric", text: "As our Saviour taught us, so we pray" },
  {
    speaker: "all",
    text: `Our Father in heaven,
hallowed be your name,
your kingdom come,
your will be done,
on earth as in heaven.
Give us today our daily bread.
Forgive us our sins
as we forgive those who sin against us.
Lead us not into temptation
but deliver us from evil.
For the kingdom, the power,
and the glory are yours
now and for ever.
Amen.`,
  },
];

// ─── The Lord's Prayer (Traditional — BCP) ──────────────────────

export const LORDS_PRAYER_BCP: LiturgicalTextBlock[] = [
  {
    speaker: "all",
    text: `Our Father, which art in heaven,
hallowed be thy name;
thy kingdom come;
thy will be done,
in earth as it is in heaven.
Give us this day our daily bread.
And forgive us our trespasses,
as we forgive them that trespass against us.
And lead us not into temptation;
but deliver us from evil.
For thine is the kingdom,
the power, and the glory,
for ever and ever.
Amen.`,
  },
];

// ─── The Nicene Creed (Common Worship) ──────────────────────────

export const NICENE_CREED: LiturgicalTextBlock[] = [
  { speaker: "rubric", text: "All stand." },
  {
    speaker: "all",
    text: `We believe in one God,
the Father, the Almighty,
maker of heaven and earth,
of all that is,
seen and unseen.

We believe in one Lord, Jesus Christ,
the only Son of God,
eternally begotten of the Father,
God from God, Light from Light,
true God from true God,
begotten, not made,
of one Being with the Father;
through him all things were made.
For us and for our salvation he came down from heaven,
was incarnate from the Holy Spirit and the Virgin Mary
and was made man.
For our sake he was crucified under Pontius Pilate;
he suffered death and was buried.
On the third day he rose again
in accordance with the Scriptures;
he ascended into heaven
and is seated at the right hand of the Father.
He will come again in glory to judge the living and the dead,
and his kingdom will have no end.

We believe in the Holy Spirit,
the Lord, the giver of life,
who proceeds from the Father and the Son,
who with the Father and the Son is worshipped and glorified,
who has spoken through the prophets.
We believe in one holy catholic and apostolic Church.
We acknowledge one baptism for the forgiveness of sins.
We look for the resurrection of the dead,
and the life of the world to come.
Amen.`,
  },
];

// ─── The Apostles' Creed (BCP) ─────────────────────────────────

export const APOSTLES_CREED: LiturgicalTextBlock[] = [
  { speaker: "rubric", text: "All stand and turn to face East." },
  {
    speaker: "all",
    text: `I believe in God the Father almighty,
maker of heaven and earth:
and in Jesus Christ his only Son our Lord,
who was conceived by the Holy Ghost,
born of the Virgin Mary,
suffered under Pontius Pilate,
was crucified, dead, and buried.
He descended into hell;
the third day he rose again from the dead;
he ascended into heaven,
and sitteth on the right hand of God the Father almighty;
from thence he shall come to judge the quick and the dead.
I believe in the Holy Ghost;
the holy catholic Church;
the communion of saints;
the forgiveness of sins;
the resurrection of the body,
and the life everlasting.
Amen.`,
  },
];

// ─── Gloria Patri ───────────────────────────────────────────────

export const GLORIA_PATRI: LiturgicalTextBlock[] = [
  {
    speaker: "all",
    text: `Glory be to the Father, and to the Son,
and to the Holy Ghost;
as it was in the beginning, is now, and ever shall be,
world without end. Amen.`,
  },
];

// ─── Prayer of Preparation (CW) ────────────────────────────────

export const PRAYER_OF_PREPARATION: LiturgicalTextBlock[] = [
  {
    speaker: "all",
    text: `Almighty God,
to whom all hearts are open,
all desires known,
and from whom no secrets are hidden:
cleanse the thoughts of our hearts
by the inspiration of your Holy Spirit,
that we may perfectly love you,
and worthily magnify your holy name;
through Christ our Lord.
Amen.`,
  },
];

// ─── Confession and Absolution (CW) ────────────────────────────

export const CONFESSION_CW: LiturgicalTextBlock[] = [
  {
    speaker: "president",
    text: "God so loved the world that he gave his only Son Jesus Christ to save us from our sins, to be our advocate in heaven, and to bring us to eternal life. Let us confess our sins in penitence and faith, firmly resolved to keep God\u2019s commandments and to live in love and peace with all.",
  },
  { speaker: "rubric", text: "Silence is kept." },
  {
    speaker: "all",
    text: `Almighty God, our heavenly Father,
we have sinned against you
and against our neighbour
in thought and word and deed,
through negligence, through weakness,
through our own deliberate fault.
We are truly sorry
and repent of all our sins.
For the sake of your Son Jesus Christ,
who died for us,
forgive us all that is past
and grant that we may serve you in newness of life
to the glory of your name.
Amen.`,
  },
  {
    speaker: "president",
    text: `Almighty God,
who forgives all who truly repent,
have mercy upon you,
pardon and deliver you from all your sins,
confirm and strengthen you in all goodness,
and keep you in life eternal;
through Jesus Christ our Lord.`,
  },
  { speaker: "all", text: "Amen." },
];

// ─── Gloria in Excelsis (CW text, may be sung) ─────────────────

export const GLORIA_IN_EXCELSIS: LiturgicalTextBlock[] = [
  {
    speaker: "all",
    text: `Glory to God in the highest,
and peace to his people on earth.

Lord God, heavenly King,
almighty God and Father,
we worship you, we give you thanks,
we praise you for your glory.

Lord Jesus Christ, only Son of the Father,
Lord God, Lamb of God,
you take away the sin of the world:
have mercy on us;
you are seated at the right hand of the Father:
receive our prayer.

For you alone are the Holy One,
you alone are the Lord,
you alone are the Most High, Jesus Christ,
with the Holy Spirit,
in the glory of God the Father.
Amen.`,
  },
];

// ─── Magnificat (BCP) ──────────────────────────────────────────

export const MAGNIFICAT_TEXT: LiturgicalTextBlock[] = [
  { speaker: "rubric", text: "All stand." },
  {
    speaker: "all",
    text: `My soul doth magnify the Lord :
  and my spirit hath rejoiced in God my Saviour.
For he hath regarded :
  the lowliness of his handmaiden.
For behold, from henceforth :
  all generations shall call me blessed.
For he that is mighty hath magnified me :
  and holy is his Name.
And his mercy is on them that fear him :
  throughout all generations.
He hath shewed strength with his arm :
  he hath scattered the proud in the imagination of their hearts.
He hath put down the mighty from their seat :
  and hath exalted the humble and meek.
He hath filled the hungry with good things :
  and the rich he hath sent empty away.
He remembering his mercy hath holpen his servant Israel :
  as he promised to our forefathers, Abraham and his seed, for ever.`,
  },
  ...GLORIA_PATRI,
];

// ─── Nunc Dimittis (BCP) ───────────────────────────────────────

export const NUNC_DIMITTIS_TEXT: LiturgicalTextBlock[] = [
  { speaker: "rubric", text: "All stand." },
  {
    speaker: "all",
    text: `Lord, now lettest thou thy servant depart in peace :
  according to thy word.
For mine eyes have seen :
  thy salvation;
Which thou hast prepared :
  before the face of all people;
To be a light to lighten the Gentiles :
  and to be the glory of thy people Israel.`,
  },
  ...GLORIA_PATRI,
];
