# AI Safety Research Atlas · public search view

Open `index.html` through a static HTTP server. It is the front page: a short scrolling story of what the atlas is, what it found and whether it helps. `atlas.html` is the visual atlas of the debate and scalable-oversight batch and reads the adjacent `data.json`; its Graph view reads `graph.json` and shows every record. Old record-explorer links (`?view=…&record=…`) open that record in the Graph view, and old atlas links on the site address (`#gaps`, `#q01`, `#graph/…`) go on to `atlas.html`. No backend or secret is required. The paper-pilot files and the 25 source-reading notes stay in the bundle as data; no page shows them since the record explorer was retired.

This bundle contains the joined atlas at merged commit `f196efd` (the v0.2.0 atlas inputs with the review fixes merged after it), which holds 1,750 records, 5,821 recorded links and 245 source records. On 1 November 2026 the maintainer moved 526 records that are not AI-safety content out of the atlas: 517 general maths facts that its proofs rest on (Lean core and Mathlib facts, names Lean writes itself, set.mm facts) and 9 test and empty records. The atlas here holds the other 1,224 records and the 2,000 links between them. The 517 facts are not dropped: `proof_dependencies.json` keeps them with all 3,818 links that touch them, and each proof's record card lists the facts it rests on. Fields, IDs, source pointers, aliases, assessments and canonical pins of every kept record come unchanged from the record explorer export of that commit. The public presentation has its own snapshot hash; `PUBLIC_BUILD_MANIFEST.json` records every output hash, the source generator and the out-of-scope list's hash. Separate Lean extracts and the Metamath sidecar are excluded.

The 25 source-reading notes are original AI-authored analysis, labelled provisional. Their original analysis snapshot is retained separately from their attachment to this public view. They do not change the records or their verification. The paper receipt rechecks an existing Lean type, not a new theorem or a full paper formalization.

`paper-pilot/` also holds the maintainer's recorded paper-to-Lean review, read-only (`paper-pilot/review_outcome.json`), with the question packet it answered (`paper-pilot/review_packet.json`). On 13 October 2026 Hatem Elshatlawy answered the packet's two Definition 6.1 questions and promoted the correctness-only claim as stated, under quorum `SINGLE_MAINTAINER`. The packet's questions, explanations and small Lean examples were drafted by Claude. Lean checked each example against the pinned debate code, and a question is shown as settled only where those checks agree. The resulting link stays open: differences D02–D07 remain, and it supports no proof, system or empirical inference. The card no longer asks for a decision. This bundle's atlas data includes the reviewed link itself, `N2:DSO:E-PAPER-LEAN-SEMANTIC-REVIEWED`, which stays open with no inference-path eligibility.

Two guided problem routes select existing records and recorded links. A route provides an order for inspection, not an inference chain. Its separate overlay hash identifies the exact selection; the underlying atlas snapshot and evidence statuses are unchanged.

Original code is Apache 2.0; see `LICENSE-CODE.txt`. Original project data, notes and documentation are CC BY 4.0, attributed to AI Safety Research Atlas contributors; AI analysis identifies Codex and its date. These grants do not relicense upstream papers, declarations, excerpts or third-party material. Source-specific attribution and links stay in the data. The displayed paper is arXiv:2311.14125v1; the Lean source is Google DeepMind's debate repository at de3a6e500ae1a65dfeea2f91ef519ebad9704be0 (Apache 2.0). No full paper or upstream source tree is redistributed here.

No coordinator keys, participant responses, local model assets or private joined-data export are included. Semantic-model search is disabled for this release.

## Visual atlas

`atlas.html` shows the 42 papers of the debate and scalable-oversight batch, their findings with exact quotes, the open questions ranked by the safety-case step they affect, and the gap-closing pilot's results. `data.json` only selects and joins existing fields; it adds no claim. All of it is an AI draft that no person has reviewed. The page labels it so, marks unverified hypothesis lists "not verified" and says how each view was checked. `PUBLIC_BUILD_MANIFEST.json` records the data's hash under `visual_atlas`.

## Definitions

`atlas.html#definitions` sets several papers' definitions of one concept side by side, with the exact words behind every cell and where the definitions agree or differ. It is an AI draft: every cell, column, statement and note went through two blind AI checks tested on planted mistakes, and no person has reviewed them. `definitions.json` holds the same comparisons for agents, with record ids and arXiv versions; `PUBLIC_BUILD_MANIFEST.json` lists it under `definitions`.

## Replications

`atlas.html#replications` shows which results other papers back up, contradict or have not yet tested. Each question card sets several papers' answers side by side, oldest first, with each paper's finding, the setting it was tested in, the exact words behind both, and what differs between the papers. Every result and main claim gets a status: holds elsewhere, conflicts, mixed, or tested once. It is an AI draft: every question, row, difference and left-out record went through two blind AI checks tested on planted mistakes, and no person has reviewed them. `replications.json` holds the same questions and statuses for agents, with record ids and arXiv versions; `PUBLIC_BUILD_MANIFEST.json` lists it under `replications`.

## Front page

`index.html` tells the atlas as a scrolling story, after a talk given in November 2026: the question (is AI safety a body of knowledge yet?), why it is hard to check, the one database the atlas builds, what it holds, what it found and whether it helps. One picture stays in view and changes with each sentence; it closes on the record graph. Every number and picture is counted from `data.json`, `atlas_data.json`, `graph.json`, `coverage_map.json` and `first_test.json` when the site is built. Only which tools are live, how each stage of the paper pipeline runs and the latest news come from a short hand-kept status file, whose hash `PUBLIC_BUILD_MANIFEST.json` records under `story`.

`coverage.html` is the AI safety coverage map, an AI-drafted outline not yet reviewed by a person: research areas, the problems inside them and the approaches that cut across areas, each problem marked by how much of it the atlas holds. Its data is `coverage_map.json`. `first-test.html` says how the first usefulness test was run, from `first_test.json`. `overview.html`, the old Overview's address, forwards to the front page, the coverage map or the first test.

## Record graph

`atlas.html#graph` draws every record as one dot, from `graph.json`; the front page shows it in a frame. Records are grouped by Louvain community detection over the recorded links, with a weaker tie between records that quote the same source; inside a group, records from one paper or one Lean namespace sit together. Groups and positions are navigation, not evidence: a group is not a field, and two dots side by side are not a link. A dot opens the record's text, state, sources and links from its agent card, and `#graph/<record id>` opens one record. `PUBLIC_BUILD_MANIFEST.json` lists the file under `record_graph`.

## For AI agents

`llms.txt` tells an AI agent how to use the atlas: its rules, its files, and a recipe for each kind of research question. `agent/index.json` lists every record with its type, state, sources and card path; `agent/papers.json` lists every source with its records; and `agent/records/` holds one small card per record with its text, its sources (with a link that opens the PDF at the cited page), its links in both directions with their state, rationale and open obligations, and a link that opens the record in the Graph view (`#graph/<id>`). All of these are built from `atlas_data.json` and `proof_dependencies.json` alone and add no paper text. A card's links to formal kernel dependencies are capped at 40 per direction; `atlas_data.json` has them all. A proof's card also lists, under `rests_on_general_facts`, the general maths facts from `proof_dependencies.json` that it uses.

## Scope

The site itself is 27 files: 26 page and data files plus `PUBLIC_BUILD_MANIFEST.json`. The agent files add `llms.txt`, two index files and one card per record, plus the gap-closing pilot's files under `agent/`.

This is the complete minimal deployment. At the maintainer's request, earlier research pages, their redirects, the large formal-index/network assets and, since 18 October 2026, the record explorer (`explore.html`) are retired from the public site. They remain recoverable in repository history. The site has no footers. Canonical research records are unchanged.
