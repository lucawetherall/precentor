# Glossary

Precentor's domain is Anglican church-music planning. These terms appear throughout
the schema, UI, and code — they are **not** general knowledge, and getting them wrong
produces logic that compiles and passes tests but is liturgically nonsense. Read this
before modelling domain behaviour.

| Term | Meaning |
|------|---------|
| **Precentor** | In a cathedral or collegiate church, the person responsible for directing sung worship. The app is named after this role. |
| **Service** | A single act of worship (e.g. a Sunday Eucharist or Evensong) — the central planned unit. Has a date, type, readings, music, and a rota. |
| **Service type** | The kind of service: Eucharist, Evensong, Morning Prayer, etc. Determines which sections and music slots apply. |
| **Service sheet** | The printable order of service the app generates (PDF / DOCX). |
| **Rite** | A particular liturgical form or tradition — chiefly **Common Worship** (modern Church of England) vs. **Book of Common Prayer (BCP)** (traditional). |
| **Evensong** | Anglican sung Evening Prayer; one of the standard service types. Its canticles are the Magnificat and Nunc Dimittis. |
| **Eucharist** | The service of Holy Communion / Mass. |
| **Eucharistic Prayer** | The central prayer of thanksgiving in the Eucharist. Common Worship offers several numbered options; the app stores selectable texts. |
| **Mass setting** | The musical setting of the sung ordinary of the Eucharist (Kyrie, Gloria, Sanctus, Benedictus, Agnus Dei) — usually by one named composer. |
| **Lectionary** | The schedule of Bible readings appointed for each Sunday and weekday of the church year. Drives which readings appear on a service. |
| **Reading / pericope** | An individual passage appointed by the lectionary (Old Testament, Epistle, Gospel, Psalm). |
| **Reading track (Continuous / Related)** | In Ordinary Time the lectionary offers two Old-Testament tracks: **Continuous** reads books semi-continuously week to week; **Related** picks a reading thematically tied to the Gospel. A church chooses one track. |
| **Collect** | A short, structured prayer appointed for a particular day or season — "the Collect of the day". |
| **Liturgical day** | A specific dated entry in the church calendar (a Sunday, feast, or commemoration), carrying its own readings, collect, and colour. |
| **Liturgical season** | A period of the church year — Advent, Christmas, Epiphany, Lent, Easter, Ordinary Time — each with an associated colour. |
| **Liturgical colour** | The colour of vestments and hangings for a season or feast (e.g. purple in Lent, white at Easter, red at Pentecost). |
| **Temporale** | The seasonal cycle of the church year (Advent → Christ the King), as distinct from fixed saints' days. |
| **Canticle** | A scriptural song used in services — e.g. the Magnificat and Nunc Dimittis at Evensong, the Te Deum at Morning Prayer. |
| **Responses** | Sung versicles-and-responses exchanged between the officiant and the choir/congregation. |
| **Introit** | An opening piece of music or text at the start of a service. |
| **Anthem** | A choral piece sung by the choir, typically after the readings or during Communion. |
| **Hymn** | A congregational song. The app tracks hymn books and individual verses. |
| **Hymn book** | A published collection of hymns (e.g. *Ancient & Modern*, *New English Hymnal*) that a church draws from. |
| **CCLI** | Christian Copyright Licensing International — the licensing scheme that permits reproducing hymn and song texts; churches store a CCLI number. |
| **Music slot** | A point in a service where a piece of music belongs (hymn, anthem, canticle, voluntary…). The unit the planner fills. |
| **Rota** | A duty roster: who is scheduled to serve — sing, play, read, serve — on which service. (British English for a recurring schedule.) |
| **Rota entry / role slot** | A single assignment within a rota: one role (e.g. organist, cantor, reader) on one service, optionally filled by one member. |
