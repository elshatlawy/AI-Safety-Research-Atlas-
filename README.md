# AI Safety Research Atlas · public search view

Open `index.html` through a static HTTP server. The interface reads the adjacent `atlas_data.json`; no backend or secret is required. A paper can be selected locally, but this website does not upload or process PDFs. Its paper page displays a separately identified technical pilot with human meaning review pending.

This bundle contains the joined atlas at merged commit `0532218` (the v0.2.0 atlas inputs): 1,750 records, 5,821 recorded links and 245 source records. Fields, IDs, source pointers, aliases, assessments and canonical pins come unchanged from the record explorer export of that commit. The public presentation has its own snapshot hash; `PUBLIC_BUILD_MANIFEST.json` records every output hash and the source generator. Separate Lean extracts and the Metamath sidecar are excluded.

The 25 source-reading notes are original AI-authored analysis, labelled provisional. Their original analysis snapshot is retained separately from their attachment to this public view. They do not change the records or their verification. The paper receipt rechecks an existing Lean type, not a new theorem or a full paper formalization.

The paper page also shows the maintainer's recorded paper-to-Lean review, read-only (`paper-pilot/review_outcome.json`), with the question packet it answered (`paper-pilot/review_packet.json`). On 13 October 2026 Hatem Elshatlawy answered the packet's two Definition 6.1 questions and promoted the correctness-only claim as stated, under quorum `SINGLE_MAINTAINER`. The packet's questions, explanations and small Lean examples were drafted by Claude. Lean checked each example against the pinned debate code, and a question is shown as settled only where those checks agree. The resulting link stays open: differences D02–D07 remain, and it supports no proof, system or empirical inference. The card no longer asks for a decision. This bundle's atlas data includes the reviewed link itself, `N2:DSO:E-PAPER-LEAN-SEMANTIC-REVIEWED`, which stays open with no inference-path eligibility.

Two guided problem routes select existing records and recorded links. A route provides an order for inspection, not an inference chain. Its separate overlay hash identifies the exact selection; the underlying atlas snapshot and evidence statuses are unchanged.

Original code is Apache 2.0; see `LICENSE-CODE.txt`. Original project data, notes and documentation are CC BY 4.0, attributed to AI Safety Research Atlas contributors; AI analysis identifies Codex and its date. These grants do not relicense upstream papers, declarations, excerpts or third-party material. Source-specific attribution and links stay in the data. The displayed paper is arXiv:2311.14125v1; the Lean source is Google DeepMind's debate repository at de3a6e500ae1a65dfeea2f91ef519ebad9704be0 (Apache 2.0). No full paper or upstream source tree is redistributed here.

No coordinator keys, participant responses, local model assets or private joined-data export are included. Semantic-model search is disabled for this release. The separate literature action sends a query to OpenAlex only when clicked; its results remain discovery metadata outside the atlas.

## For AI agents

`llms.txt` tells an AI agent how to use the atlas: its rules, its files, and a recipe for each kind of research question. `agent/index.json` lists every record with its type, state, sources and card path; `agent/papers.json` lists every source with its records; and `agent/records/` holds one small card per record with its text, its sources (with a link that opens the PDF at the cited page), its links in both directions with their state, rationale and open obligations, and a link to the record on this website. All of these are built from `atlas_data.json` alone and add no paper text. A card's links to formal kernel dependencies are capped at 40 per direction; `atlas_data.json` has them all.

## Scope

The site itself is 21 files: 20 interface and data files plus `PUBLIC_BUILD_MANIFEST.json`. The agent files add `llms.txt`, two index files and one card per record.

This is the complete minimal deployment. At the maintainer's request, earlier research pages, their redirects and the large formal-index/network assets are retired from the public site. They remain recoverable in repository history. The footer stays within this interface: Data, About and Contribute. Canonical research records are unchanged.
