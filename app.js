"use strict";

// A view of the validated joined atlas. Search relevance and recorded adjacency
// never change identity, relation, or verification status.
const $ = id => document.getElementById(id);
const state = {
  data: null, nodes: new Map(), sources: new Map(), incidents: new Map(), crossDomainLeads: new Map(), crossDomainVersion: "", crossDomainPin: "",
  paperPilot: null, paperPilotPin: "", paperPilotMismatch: false,
  researchNotes: new Map(), researchNotePin: "", researchNoteMismatch: false,
  problemRoutes: new Map(), problemRoutePin: "", problemRouteId: "", problemStage: "problem", knowledgeBranch: "formal", problemRouteMismatch: false,
  query: "", view: "search", selected: "", type: "", recordState: "", visible: 12,
  resultEntries: [], graphOpen: false, graphMode: "graph", linkPage: 0, chosenEdge: "", saved: new Set(),
  mismatch: false, crossDomainMismatch: false,
  meaning: {query:"",type:"",recordState:"",requested:false,loading:false,results:[],error:"",serial:0,abstained:false},
  literature: {query:"", requested:false, loading:false, results:[], error:"", controller:null, serial:0, lastStarted:0}
};
const AXES = [
  {label:"Formal correctness", dimensions:["FORMAL_CHECK","LEAN_KERNEL_CHECK"]},
  {label:"Semantic correspondence", dimensions:["SEMANTIC_REVIEW","SOURCE_FIDELITY"]},
  {label:"Implementation correspondence", dimensions:["IMPLEMENTATION_CORRESPONDENCE","IMPLEMENTATION_AUDIT","APPLICATION_PREMISES"]},
  {label:"Empirical support", dimensions:["EMPIRICAL_SUPPORT"]}
];
const preferredStarts = ["N2:TD:PAPER-TERM", "N2:XDOM:OBSERVATION-POLICY-STRUCTURE", "PAPER-THM-6.2"];
const LITERATURE_CONTEXT = "AI safety and machine learning research related to: ";
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
const short = (value, max=180) => {const text=String(value ?? "").trim(); return text.length>max ? `${text.slice(0,max-1).trimEnd()}…` : text;};
const pretty = value => String(value ?? "").replaceAll("_"," ").replace(/\b\w/g, c=>c.toUpperCase());
const typeGroup = value => String(value ?? "").replaceAll("_"," ").trim().toLocaleLowerCase();
const safeHref = href => {try {const url=new URL(String(href ?? "")); return url.protocol==="https:" ? url.href : "";} catch {return "";}};
const sourceFor = ref => state.sources.get(ref?.source_id);
const nodeFor = id => state.nodes.get(id);
const problemRoute = () => state.problemRoutes.get(state.problemRouteId);
function problemPart(route=problemRoute()) {
  const stage=route?.stages.find(s=>s.id===state.problemStage);
  return stage?.id==="knowledge"?stage.groups.find(g=>g.id===state.knowledgeBranch):stage;
}
function clearProblemRoute() {state.problemRouteId="";state.problemRouteMismatch=false;state.problemStage="problem";state.knowledgeBranch="formal";}
const capability = name => state.data?.capabilities?.[name] !== false;
const recordStateClass = value => String(value ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "");
const snapshotId = () => state.data?.snapshot?.id || "";
const storageKey = () => `asra-collection-v1:${snapshotId()}`;
const noData = message => `<p class="quiet-value">${esc(message)}</p>`;
const asText = value => typeof value === "string" ? value : value && typeof value === "object" ? (value.statement || value.text || value.description || value.title || JSON.stringify(value)) : String(value ?? "");
function setSnapshotBlocked(blocked) {
  for(const element of [$("search-input"),$("search-form").querySelector("button"),$("saved-trigger"),$("type-filter"),$("state-filter"),$("paper-example-open"),$("meaning-search"),$("literature-search"),...document.querySelectorAll("[data-example-query]")]) element.disabled=blocked;
}

// Semantic retrieval is an opt-in navigation trial over this same snapshot.
// Its candidates never affect IDs, graph edges, or verification assessments.
function resetMeaning(query) {
  const meaning=state.meaning;
  if(meaning.query===query&&meaning.type===state.type&&meaning.recordState===state.recordState) return;
  meaning.serial+=1;
  Object.assign(meaning,{query,type:state.type,recordState:state.recordState,requested:false,loading:false,results:[],error:"",abstained:false});
}
function shownIndexedIds() {
  return new Set(state.resultEntries.filter(entry=>(!state.type||typeGroup(entry.node.type)===state.type)&&(!state.recordState||entry.node.state===state.recordState)).slice(0,state.visible).map(entry=>entry.node.id));
}
function renderMeaning() {
  const meaning=state.meaning, query=state.query.trim();
  const block=$("meaning-boundary"),button=$("meaning-search"),status=$("meaning-status"),list=$("meaning-results");
  block.hidden=!query||state.mismatch||!capability("semantic_candidates");
  if(block.hidden) return;
  button.disabled=meaning.loading||query.length>1800;
  button.innerHTML=meaning.loading?"Searching this snapshot…":meaning.requested?"Search related meanings again <span aria-hidden=\"true\">↗</span>":"Find related atlas records <span aria-hidden=\"true\">↗</span>";
  const shown=shownIndexedIds();
  const entries=meaning.results.filter(candidate=>{
    const node=nodeFor(candidate.record_id);
    return node && !shown.has(node.id) && (!state.type||typeGroup(node.type)===state.type) && (!state.recordState||node.state===state.recordState) && (node.source_refs||[]).some(ref=>ref.source_id===candidate.source_ref?.source_id&&ref.locator===candidate.source_ref?.locator);
  }).map(candidate=>({node:nodeFor(candidate.record_id),match_kind:"SEMANTIC_CANDIDATE"}));
  status.textContent=query.length>1800?"Shorten the query to use this local model.":meaning.loading?"Loading the pinned model and comparing indexed records in this browser…":meaning.error||(!meaning.requested?"The model is not loaded until you click.":meaning.abstained||!entries.length?"No additional related record cleared this trial's cutoff.":`${entries.length} additional possible atlas record${entries.length===1?"":"s"} · inspect source meaning before using a match.`);
  status.classList.toggle("error",Boolean(meaning.error));
  list.innerHTML=entries.map(renderResult).join("");
  list.querySelectorAll("[data-record]").forEach(el=>el.addEventListener("click",()=>selectRecord(el.dataset.record)));
}
async function searchMeaning() {
  const meaning=state.meaning,query=state.query.trim();
  if(!capability("semantic_candidates")||!query||query.length>1800||state.mismatch||meaning.loading) return;
  const serial=++meaning.serial;
  Object.assign(meaning,{query,requested:true,loading:true,results:[],error:"",abstained:false});
  renderMeaning();
  try {
    const {SemanticAtlas}=await import("./semantic_v1/browser.js");
    await SemanticAtlas.prepare({manifestUrl:"./semantic_v1/index.local.json",expectedSnapshot:snapshotId(),atlasData:state.data});
    const eligibleRecordIds=state.data.nodes.filter(node=>(!state.type||typeGroup(node.type)===state.type)&&(!state.recordState||node.state===state.recordState)).map(node=>node.id);
    const found=await SemanticAtlas.search(query,{limit:8,excludeRecordIds:[...shownIndexedIds()],eligibleRecordIds});
    if(serial!==meaning.serial) return;
    if(found.snapshot_id!==snapshotId()) throw Error("Meaning-search results belong to another snapshot.");
    meaning.results=Array.isArray(found.candidates)?found.candidates.slice(0,5):[];
    meaning.abstained=Boolean(found.abstained);
  } catch(error) {
    if(serial!==meaning.serial) return;
    meaning.error=error?.message||"This local meaning-search trial is unavailable.";
  } finally {
    if(serial===meaning.serial){meaning.loading=false;renderMeaning();}
  }
}

// OpenAlex is an opt-in discovery lane. Its metadata never enters atlas nodes,
// relationships, assessments, or the saved-record collection.
function resetLiterature(query) {
  const literature=state.literature;
  if(literature.query===query) return;
  literature.controller?.abort();
  literature.serial+=1;
  Object.assign(literature,{query,requested:false,loading:false,results:[],error:"",controller:null});
}
function openAlexLink(work) {
  for(const [value,host,path] of [[work?.doi,"doi.org",/^\/10\./i],[work?.id,"openalex.org",/^\/W\d+$/]]) {
    try {const url=new URL(String(value||""));if(url.protocol==="https:"&&url.hostname===host&&path.test(url.pathname)) return url.href;} catch {}
  }
  return "";
}
function renderLiterature() {
  const literature=state.literature;
  const query=state.query.trim();
  const block=$("literature-boundary"),button=$("literature-search"),status=$("literature-status"),list=$("literature-results");
  block.hidden=!query||state.mismatch||!capability("wider_literature");
  if(block.hidden) return;
  button.disabled=literature.loading||query.length+LITERATURE_CONTEXT.length>2000;
  button.innerHTML=literature.loading?"Searching OpenAlex…":literature.requested?"Search again <span aria-hidden=\"true\">↗</span>":"Search wider literature <span aria-hidden=\"true\">↗</span>";
  status.textContent=query.length+LITERATURE_CONTEXT.length>2000?"OpenAlex accepts at most 2,000 characters. Shorten this query to search wider literature.":literature.loading?"Looking for papers with related meaning…":literature.error||(!literature.requested?"No request is sent until you click.":literature.results.length?`${literature.results.length} OpenAlex work${literature.results.length===1?"":"s"} found · discovery metadata only`:"No OpenAlex works returned for this query.");
  status.classList.toggle("error",Boolean(literature.error));
  list.innerHTML=literature.results.map(work=>{
    const href=openAlexLink(work),title=short(work.title||"Untitled work",220),year=Number.isInteger(work.publication_year)&&work.publication_year>=1000&&work.publication_year<=2100?String(work.publication_year):"Year not indexed";
    return `<article class="literature-card"><span class="literature-meta">OpenAlex metadata · ${esc(year)}</span><h4>${href?`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(title)} <span aria-hidden="true">↗</span></a>`:esc(title)}</h4><p>Outside the atlas · source meaning and claims have not been reviewed here.</p></article>`;
  }).join("");
}
async function searchLiterature() {
  const literature=state.literature,query=state.query.trim();
  if(!capability("wider_literature")||!query||query.length+LITERATURE_CONTEXT.length>2000||state.mismatch||literature.loading) return;
  if(Date.now()-literature.lastStarted<1100){literature.error="Please wait a moment before another OpenAlex search.";renderLiterature();return;}
  literature.controller?.abort();
  const controller=new AbortController(),serial=++literature.serial;
  Object.assign(literature,{query,controller,requested:true,loading:true,error:"",results:[],lastStarted:Date.now()});
  renderLiterature();
  const timeout=setTimeout(()=>controller.abort(),8000);
  try {
    const url=new URL("https://api.openalex.org/works");
    url.searchParams.set("search.semantic",LITERATURE_CONTEXT+query);
    url.searchParams.set("per_page","6");
    url.searchParams.set("select","id,title,publication_year,doi");
    const response=await fetch(url,{signal:controller.signal,headers:{Accept:"application/json"}});
    if(response.status===429) throw new Error("OpenAlex is rate-limiting requests. Please wait and try again.");
    if(!response.ok) throw new Error(`OpenAlex is unavailable (HTTP ${response.status}). Try again later.`);
    const payload=await response.json();
    if(!Array.isArray(payload?.results)) throw new Error("OpenAlex returned an unexpected response. Try again later.");
    if(serial!==literature.serial) return;
    literature.results=payload.results.slice(0,6).filter(work=>work&&typeof work==="object");
  } catch(error) {
    if(serial!==literature.serial) return;
    literature.error=controller.signal.aborted?"OpenAlex took too long to respond. Please try again.":error.message||"OpenAlex could not be reached. Try again later.";
  } finally {
    clearTimeout(timeout);
    if(serial===literature.serial){literature.loading=false;literature.controller=null;renderLiterature();}
  }
}

function setRoute({replace=false}={}) {
  if (!state.data || state.mismatch) return;
  const url=new URL(location.href);
  url.searchParams.set("snapshot",snapshotId());
  if(state.crossDomainPin && !state.crossDomainMismatch) url.searchParams.set("lead_overlay",state.crossDomainPin);
  if(state.researchNotePin && !state.researchNoteMismatch) url.searchParams.set("note_overlay",state.researchNotePin);
  if(state.paperPilotPin && !state.paperPilotMismatch) url.searchParams.set("pilot_overlay",state.paperPilotPin);
  url.searchParams.set("view",state.view);
  if(problemRoute()&&!state.problemRouteMismatch) {
    url.searchParams.set("route",state.problemRouteId);url.searchParams.set("stage",state.problemStage);url.searchParams.set("route_overlay",state.problemRoutePin);
    if(state.problemStage==="knowledge")url.searchParams.set("branch",state.knowledgeBranch);else url.searchParams.delete("branch");
  } else if(!state.problemRouteMismatch)for(const key of ["route","stage","branch","route_overlay"])url.searchParams.delete(key);
  if (state.view==="search" && state.query) url.searchParams.set("q",state.query); else url.searchParams.delete("q");
  if (state.view==="search" && state.selected) url.searchParams.set("record",state.selected); else url.searchParams.delete("record");
  history[replace?"replaceState":"pushState"]({},"",url);
}
function applyURL() {
  const params=new URLSearchParams(location.search);
  if (params.has("snapshot") && params.get("snapshot")!==snapshotId()) {
    state.mismatch=true; state.selected=""; state.query="";
    $("snapshot-mismatch").hidden=false;
    setSnapshotBlocked(true);
    showView("search",false); $("search-input").value=""; renderResults();
    return;
  }
  state.mismatch=false; $("snapshot-mismatch").hidden=true;
  setSnapshotBlocked(false);
  state.crossDomainMismatch=Boolean(params.has("lead_overlay") && params.get("lead_overlay")!==state.crossDomainPin);
  state.paperPilotMismatch=Boolean(params.has("pilot_overlay") && params.get("pilot_overlay")!==state.paperPilotPin);
  renderPaperPilot();
  state.researchNoteMismatch=Boolean(params.has("note_overlay") && params.get("note_overlay")!==state.researchNotePin);
  state.problemRouteId=params.get("route")||"";
  state.problemRouteMismatch=Boolean(state.problemRouteId&&(!problemRoute()||(params.has("route_overlay")&&params.get("route_overlay")!==state.problemRoutePin)));
  state.problemStage=problemRoute()?.stages.some(s=>s.id===params.get("stage"))?params.get("stage"):"problem";
  state.knowledgeBranch=params.get("branch")==="empirical"?"empirical":"formal";
  state.query=state.problemRouteId?"":params.get("q") || "";
  state.selected=nodeFor(params.get("record")) ? params.get("record") : "";
  state.graphOpen=false; state.graphMode="graph"; state.linkPage=0; state.chosenEdge="";
  $("search-input").value=state.query;
  showView(["search","paper","about"].includes(params.get("view")) ? params.get("view") : "search",false);
  renderResults(); if (state.selected && state.view==="search") renderRecord();
  if (!params.has("snapshot") || (state.crossDomainPin && !params.has("lead_overlay")) || (state.researchNotePin && !params.has("note_overlay")) || (state.paperPilotPin && !params.has("pilot_overlay")) || (problemRoute()&&!params.has("route_overlay"))) setRoute({replace:true});
}
function openProblemRoute(id) {
  if(state.mismatch||!state.problemRoutes.has(id))return;
  Object.assign(state,{problemRouteId:id,problemRouteMismatch:false,problemStage:"problem",knowledgeBranch:"formal",query:"",selected:"",type:"",recordState:"",visible:12,graphOpen:false,chosenEdge:""});
  $("search-input").value="";$("type-filter").value="";$("state-filter").value="";
  showView("search",false);renderResults();setRoute();
  $("results-anchor").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth"});
}
function renderProblemEntry() {
  $("problem-entry").hidden=!state.problemRoutes.size;
  $("problem-starters").innerHTML=[...state.problemRoutes.values()].map(route=>`<button type="button" data-problem-route="${esc(route.id)}" ${state.mismatch?"disabled":""} aria-pressed="${state.problemRouteId===route.id}">${esc(route.question)} <span aria-hidden="true">↗</span></button>`).join("");
}
function renderProblemRoute() {
  const box=$("problem-route-panel"),route=problemRoute(),part=problemPart(route);
  box.hidden=!state.problemRouteId||state.mismatch;
  if(box.hidden)return;
  if(state.problemRouteMismatch||!route||!part){box.innerHTML='<p>This link names a different or unavailable route version. No newer route has been opened.</p><button class="text-link" data-clear-problem type="button">Return to concept search →</button>';return;}
  const stage=route.stages.find(s=>s.id===state.problemStage);
  const edgeIds=[...(stage.id==="knowledge"?stage.edge_ids:[]),...part.edge_ids];
  const links=edgeIds.map(id=>state.data.edges.find(e=>e.id===id)).filter(Boolean);
  box.innerHTML=`<div class="route-panel-head"><span>GUIDED PROBLEM · ONE ATLAS</span><button class="text-link" data-clear-problem type="button">Back to concept search</button></div><ol class="route-stages">${route.stages.map((s,i)=>`<li><button type="button" data-route-stage="${esc(s.id)}" aria-pressed="${s.id===state.problemStage}"><span>${String(i+1).padStart(2,"0")}</span><strong>${esc(s.label)}</strong></button></li>`).join("")}</ol>${stage.id==="knowledge"?`<div class="route-branches" aria-label="Knowledge branches">${stage.groups.map(group=>`<button type="button" data-route-branch="${esc(group.id)}" aria-pressed="${group.id===state.knowledgeBranch}">${group.id==="formal"?"Formal results & arguments":"Empirical evidence & gaps"}</button>`).join("")}</div>`:""}<p class="route-scope">${esc(part.summary)}</p>${links.length?`<details class="route-connections"><summary>Inspect ${links.length} recorded connection${links.length===1?"":"s"}</summary><div>${links.map(e=>`<button type="button" data-route-edge="${esc(e.id)}"><span>${esc(short(nodeFor(e.source)?.title||e.source,65))} → ${esc(short(nodeFor(e.target)?.title||e.target,65))}</span><small>${esc(pretty(e.relation))} · ${esc(pretty(e.state))}${e.disposition&&e.disposition!=="UNASSESSED"?` · ${esc(pretty(e.disposition))}`:""}</small></button>`).join("")}</div></details>`:""}<p class="route-boundary">Navigation stages, not a composed argument. Shared structures may be source-specific or proposed.</p><details class="route-obligation"><summary>What still needs evidence?</summary><p>${esc(route.main_open_question)}</p></details>`;
}
function showView(view,update=true) {
  // Only a change of page returns to the top; re-showing the current view
  // (opening a record, a route or a search) keeps the reader's place.
  const changed=view!==state.view||$(`${view}-view`).hidden;
  state.view=view;
  for (const name of ["search","paper","about"]) {
    $(`${name}-view`).hidden=name!==view;
    document.querySelectorAll(`[data-view-link="${name}"]`).forEach(link => {
      if(name===view) link.setAttribute("aria-current","page"); else link.removeAttribute("aria-current");
    });
  }
  document.title=`${view==="search"?"Search":view==="paper"?"Analyze a paper · Preview":"About"} · AI Safety Research Atlas`;
  if(update) setRoute();
  if(changed) scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth"});
}
function sourceLine(ref, compact=false) {
  const source=sourceFor(ref);
  const title=source?.title || ref?.source_id || "Source not indexed";
  const locator=ref?.locator || "Exact location not yet indexed";
  if(compact) return short(`${title} · ${locator}`,95);
  const href=safeHref(source?.href);
  return `<div class="source-entry"><strong>${href?`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a>`:esc(title)}</strong><small>${esc(locator)}</small>${source?.revision?`<small>Version: ${esc(source.revision)}</small>`:""}</div>`;
}
function renderCrossDomainLeads(node) {
  const example=state.crossDomainLeads.get(node.id);
  if(!example) return "";
  if(state.crossDomainMismatch) return `<section class="detail-section bridge-section"><h3>Across fields</h3><p>This link names a different source-reading overlay. The newer draft is closed for this URL; remove the <code>lead_overlay</code> parameter to view the current proposal.</p></section>`;
  const sourceHref=safeHref(example.source_url);
  const leadLines=example.leads.map((lead,index)=>`<details class="bridge-lead"><summary><span class="bridge-lead-index">${String(index+1).padStart(2,"0")}</span><span><strong>${esc(lead.target_label)}</strong><small>${esc(lead.field_label)} · ${esc(lead.relation_label)}</small></span></summary><div class="bridge-lead-body"><p>${esc(lead.explanation)}</p><p><strong>Source location:</strong> ${esc(lead.locator)}</p><p><strong>Conditions:</strong> ${esc(lead.conditions)}</p><p><strong>Review needed:</strong> ${esc(lead.open_obligation)}</p><button type="button" class="text-link bridge-search" data-search-lead="${esc(lead.target_label)}">Look up this term in the atlas →</button></div></details>`).join("");
  return `<section class="detail-section bridge-section" aria-label="Across-field research leads"><div class="bridge-title"><h3>Across fields</h3><span>Proposed research leads</span></div><p>Where this paper connects to other ideas. These source-reading leads are outside the joined atlas graph and have not received relationship review.</p><div class="bridge-focus"><span>FROM THIS RECORD</span><strong>${esc(example.anchor_label)}</strong></div><div class="bridge-leads">${leadLines}</div><p class="bridge-source">Source: ${sourceHref?`<a href="${esc(sourceHref)}" target="_blank" rel="noopener noreferrer">${esc(example.source_title)} ↗</a>`:esc(example.source_title)} · ${esc(state.crossDomainVersion||"draft overlay")}</p></section>`;
}
function renderPaperPilot() {
  const box=$("paper-pilot-result"),pilot=state.paperPilot;
  box.hidden=!pilot&&!state.paperPilotMismatch;
  if(state.paperPilotMismatch) {box.innerHTML='<h2>Pinned pilot version unavailable</h2><p>This link names a different pilot receipt. Remove the <code>pilot_overlay</code> parameter to deliberately view the current run.</p>';return;}
  if(!pilot) return;
  const span=pilot.source_spans.T62;
  box.innerHTML=`<div class="pilot-heading"><div><span class="step-count">ONE LOCAL TECHNICAL PILOT</span><h2>A paper, a correction, a checked type.</h2></div><span class="literature-badge">Human meaning review pending</span></div>
    <p>We traced ${esc(pilot.paper_id)} through the existing local work-packet tool. The webpage shows that run's results; choosing another PDF above does not process it.</p>
    <div class="pilot-results"><article><span>01 · SOURCE</span><h3>Exact pages pinned</h3><p>Definition, protocol, theorem and Lean remark. The theorem is on physical page ${esc(span.physical_pdf_page)}, extracted lines ${esc(span.pdftotext_line_start)}–${esc(span.pdftotext_line_end)}.</p></article><article><span>02 · EXTRACTION</span><h3>A real correction</h3><p>The text extract flattened 3/5 and 2/5 to 35 and 25. AI inspection of the rendered page recorded the correction for human confirmation.</p></article><article><span>03 · FORMAL CHECK</span><h3>Existing Lean result rechecked</h3><p>Lean accepted the exact restated correctness type. Seven paper-to-Lean differences remain open; this run adds no new theorem.</p></article></div>
    <div class="pilot-standing"><span><strong>Formal correctness</strong>Checked type only</span><span><strong>Source meaning</strong>AI draft · open</span><span><strong>System applicability</strong>Not assessed</span><span><strong>Empirical support</strong>Not assessed</span></div>
    <div class="pilot-links"><a href="./paper-pilot/FIDELITY_REPORT.md" target="_blank" rel="noopener">Read the seven differences ↗</a><a href="./paper-pilot/CORRECTION_LOG.md" target="_blank" rel="noopener">Inspect corrections ↗</a><a href="./paper-pilot/summary.json" download>Download run receipt</a></div>
    <details><summary>Source pins and check scope</summary><p>PDF SHA-256: <code>${esc(pilot.pdf_sha256)}</code></p><p>Source acquisition: ${esc(pilot.source_acquisition)}</p><p>${esc(pilot.lean_toolchain)} · Debate commit <code>${esc(pilot.debate_commit)}</code></p><p>Axioms reported: ${esc(Object.values(pilot.axioms_reported).flat().join(", "))}. The source was recompiled against cached pinned imports; this is not a clean rebuild of every dependency. E003 remains open and the atlas is unchanged.</p></details>`;
}
function renderReviewCard(packet,pin) {
  const box=$("paper-review");box.innerHTML=AtlasReviewCard.render(packet);box.hidden=false;
  $("review-form").addEventListener("submit",event=>{
    event.preventDefault();
    const form={};for(const [key,value] of new FormData(event.target))form[key]=value;
    const response=AtlasReviewCard.collect(form,packet,{pin,now:new Date().toISOString().replace(/\.\d+Z$/,"Z")});
    const found=AtlasReviewCard.problems(response,packet),box=$("review-problems");
    box.innerHTML=found.length?`<ul>${found.map(item=>`<li>${esc(item)}</li>`).join("")}</ul>`:"";
    if(found.length)return;
    download(`${packet.id.toLowerCase()}-decision.json`,JSON.stringify(response,null,2)+"\n","application/json");
    box.innerHTML='<p>Decision file saved. Send it to the maintainer, or add it to the repository in a pull request.</p>';
  });
}
function startingEntries() {
  const chosen=preferredStarts.map(nodeFor).filter(Boolean);
  if(chosen.length<3) chosen.push(...state.data.nodes.filter(n=>!chosen.some(c=>c.id===n.id) && ["HUMAN_REVIEWED","SOURCE_ANCHORED"].includes(n.state)).slice(0,3-chosen.length));
  return chosen.map(node=>({node,match_kind:"START",match_field:"selected starting point",source_refs:node.source_refs||[]}));
}
function computeEntries() {
  if(state.problemRouteMismatch)return [];
  if(problemRoute())return problemPart()?.record_ids.map(nodeFor).filter(Boolean).map(node=>({node,match_kind:"PROBLEM_ROUTE"}))||[];
  if(!state.query.trim()) return startingEntries();
  const result=AtlasConceptSearch.search({query:state.query,nodes:state.data.nodes,edges:state.data.edges,sources:state.data.sources,aliases:state.data.aliases||[],limit:state.data.nodes.length,connectionLimit:0});
  return result.records;
}
function matchExplanation(entry) {
  if(entry.match_kind==="PROBLEM_ROUTE")return "Existing record in this navigation stage";
  if(entry.match_kind==="START") return "A source-pinned place to begin";
  if(entry.match_kind==="SEMANTIC_CANDIDATE") return "Similar indexed text · compare exact wording and scope";
  if(entry.match_kind==="ALIAS") return `Matched alias “${short(entry.alias_literal,60)}” · ${entry.match_status || "unreviewed"} search label`;
  if(entry.match_kind==="LINK_WORDING") return "Matched wording on a recorded connection; inspect its scope";
  if(entry.match_kind==="CONNECTED") return `Directly connected through a stored ${entry.via_edge?.relation || "link"}; not an identity claim`;
  return `Matched ${entry.match_field || "record text"}`;
}
function renderResult(entry) {
  const n=entry.node;
  // A source-field hit can show its exact matched source. Link-wording and
  // neighbor hits must retain the record's own source, never a linked source.
  const sourceMatch=entry.match_kind==="RECORD" && ["cited source title","cited source location"].includes(entry.match_field);
  const ref=(sourceMatch&&entry.source_refs?.[0]) || n.source_refs?.[0];
  const semanticSource=entry.match_kind==="SEMANTIC_CANDIDATE";
  const sourceCaption=semanticSource?(n.source_refs||[]).length>1?`${n.source_refs.length} record source locations · inspect all`:`Record source (not matched passage) · ${ref?sourceLine(ref,true):"location not indexed"}`:`${sourceMatch?"Matched source · ":""}${ref?sourceLine(ref,true):"Source location not yet indexed"}`;
  return `<button type="button" class="result-card ${state.selected===n.id?"selected":""}" data-record="${esc(n.id)}" aria-label="Inspect ${esc(n.title)}">
    <span class="card-top"><span class="type-label">${esc(pretty(n.type||"Record"))}</span><span class="state-label ${recordStateClass(n.state)}">${esc(pretty(n.state||"Unassessed"))}</span>${semanticSource?'<span class="alias-label">Similarity lead</span>':entry.match_kind==="ALIAS"?`<span class="alias-label">Alias · ${esc(pretty(entry.match_status||"Proposed"))}</span>`:""}</span>
    <h3>${esc(n.title||n.id)}</h3><p>${esc(short(n.text||n.core_content?.meaning||n.formal_statement||"No description indexed for this record.",205))}</p>
    <span class="card-bottom"><span class="match-label">${esc(matchExplanation(entry))}</span><span class="source-mini">${esc(sourceCaption)}</span></span>
  </button>`;
}
function renderResults() {
  if(!state.data) return;
  renderProblemEntry();renderProblemRoute();
  resetMeaning(state.query.trim());
  resetLiterature(state.query.trim());
  if(state.mismatch) {
    $("results-title").textContent="Another snapshot is pinned";
    $("results-description").textContent="The records in this public snapshot remain closed until you choose to use its snapshot.";
    $("results-count").textContent="No records opened";
    $("results-list").innerHTML='<div class="empty-state">This link names a different snapshot. Open the matching build, or choose “Use current snapshot” above to inspect these records.</div>';
    $("record-panel").hidden=true;$("more-results").hidden=true;renderMeaning();renderLiterature();
    return;
  }
  state.resultEntries=computeEntries();
  const entries=state.resultEntries.filter(e=>(!state.type||typeGroup(e.node.type)===state.type)&&(!state.recordState||e.node.state===state.recordState));
  const query=state.query.trim();
  const route=problemRoute(),part=problemPart(route);
  $("results-title").textContent=state.problemRouteMismatch?"Route version unavailable":route?`${route.title} · ${part.label}`:query?`Results for “${short(query,55)}”`:"A place to begin";
  $("results-description").textContent=state.problemRouteMismatch?"Return to search or choose a current problem route.":route?route.summary:query?"Ranked matches and directly linked records from the full selected joined atlas. Ranking does not verify a claim or merge concepts.":"Three source-pinned starting points from the current joined atlas.";
  if(query) {
    const direct=entries.filter(e=>e.match_kind!=="CONNECTED").length;
    const connected=entries.length-direct;
    $("results-count").textContent=`${direct.toLocaleString()} indexed matches${connected?` · ${connected.toLocaleString()} linked records`:""}`;
  } else $("results-count").textContent=route?`${entries.length} existing records in this stage`:`${entries.length} starting points`;
  const shown=entries.slice(0,state.visible);
  $("results-list").innerHTML=shown.length?shown.map(renderResult).join(""):`<div class="empty-state"><strong>No indexed result for this search.</strong><br>Try a broader term or clear the filters. This snapshot has selected coverage; absence from it is not absence from AI safety research.</div>`;
  $("more-results").hidden=entries.length<=state.visible;
  $("more-results").textContent=`Show more indexed matches (${Math.min(24,entries.length-state.visible)} of ${(entries.length-state.visible).toLocaleString()} remaining) ↓`;
  renderMeaning();renderLiterature();
  $("results-list").querySelectorAll("[data-record]").forEach(el=>el.addEventListener("click",()=>selectRecord(el.dataset.record)));
  if(state.selected) renderRecord(); else $("record-panel").hidden=true;
}
function evidenceDetails(items) {
  if(!Array.isArray(items)||!items.length) return noData("No evidence pointer is indexed in this view.");
  return items.map(item=>{
    const refs=Array.isArray(item.source_ref)?item.source_ref:item.source_ref?[item.source_ref]:[];
    const record=nodeFor(item.node_id);
    const href=safeHref(item.href);
    return `<div class="assessment-evidence"><p><strong>${esc(item.role||"Recorded evidence")} · ${esc(item.kind||"Pointer")}</strong></p>${record?`<button class="text-link" type="button" data-evidence-record="${esc(record.id)}">Inspect ${esc(record.title||record.id)} →</button>`:item.node_id?`<p>Referenced record: ${esc(item.node_id)} · not in this view</p>`:""}${refs.map(ref=>sourceLine(ref)).join("")}${href?`<p><a href="${esc(href)}" target="_blank" rel="noopener noreferrer">Inspect artifact ↗</a></p>`:""}${item.locator?`<p>Location: ${esc(item.locator)}</p>`:""}${item.sha256?`<p>SHA-256: <code>${esc(item.sha256)}</code></p>`:""}${item.note?`<p>${esc(item.note)}</p>`:""}</div>`;
  }).join("");
}
function assessmentDetails(assessment) {
  return `<details class="assessment-detail"><summary>${esc(assessment.result||"Recorded assessment")} · ${esc(assessment.dimension)} · inspect scope and evidence</summary><p><strong>Scope:</strong> ${esc(assessment.scope||"Not separately indexed")}</p><p><strong>Basis:</strong> ${esc(assessment.basis||"Not separately indexed")}</p>${evidenceDetails(assessment.evidence_links)}</details>`;
}
function renderAssessments(node) {
  return AXES.map(axis=>{
    const assessments=(node.assessments||[]).filter(a=>axis.dimensions.includes(a.dimension));
    const label=!assessments.length?"Not assessed":assessments.length===1?(`${assessments[0].result||"Recorded assessment"} · scoped`):`${assessments.length} scoped results`;
    return `<div class="assessment-row"><span>${esc(axis.label)}</span><span class="assessment-result ${assessments.length?"":"missing"}">${esc(label)}</span></div>${assessments.map(assessmentDetails).join("")}`;
  }).join("");
}
function meaningfulContent(node) {
  const core=node.core_content||{};
  const entries=Object.entries(core).filter(([,value])=>typeof value==="string"&&value.trim());
  if(!entries.length && !node.formal_statement) return "";
  return `<section class="detail-section"><h3>Recorded statement or definition</h3>${entries.map(([key,value])=>`<p><strong>${esc(pretty(key))}:</strong> ${esc(value)}</p>`).join("")}${node.formal_statement?`<p><strong>Formal statement:</strong> ${esc(node.formal_statement)}</p>`:""}</section>`;
}
function listItems(items,empty) {
  const texts=(Array.isArray(items)?items:[]).filter(Boolean).map(asText);
  return texts.length?`<ul>${texts.map(item=>`<li>${esc(short(item,330))}</li>`).join("")}</ul>`:noData(empty);
}
function renderRecord() {
  const n=nodeFor(state.selected); const panel=$("record-panel");
  if(!n){panel.hidden=true;return;}
  const direct=state.incidents.get(n.id)||[];
  const refs=n.source_refs||[];
  const prereqs=direct.filter(e=>e.source===n.id && /requires|depends_on|uses/i.test(e.relation||"")).slice(0,4);
  const obligatedLinks=direct.filter(e=>Array.isArray(e.open_obligations)&&e.open_obligations.some(Boolean));
  const otherAssess=(n.assessments||[]).filter(a=>!AXES.some(axis=>axis.dimensions.includes(a.dimension)));
  const typedPayload=Object.entries(n.typed_payloads||{}).map(([domain,fields])=>{
    const items=Object.entries(fields||{}).filter(([,value])=>typeof value==="string"&&value.trim());
    return items.length?`<p><strong>${esc(pretty(domain))}</strong></p>${items.map(([field,value])=>`<p><strong>${esc(pretty(field))}:</strong> ${esc(value)}</p>`).join("")}`:"";
  }).filter(Boolean).join("");
  panel.hidden=false;
  panel.innerHTML=`<div class="record-head"><div class="record-head-top"><div><span class="type-label">${esc(pretty(n.type||"Record"))}</span><h2>${esc(n.title||n.id)}</h2></div><button id="close-record" class="icon-button" type="button" aria-label="Close record">×</button></div><span class="state-label ${recordStateClass(n.state)}">${esc(pretty(n.state||"Unassessed"))}</span><p class="record-summary">${esc(n.text||"No description indexed for this record.")}</p><div class="record-actions"><button id="save-record" type="button" class="outline-button">${state.saved.has(n.id)?"Remove saved":"Save record"}</button><button id="toggle-connections" type="button" class="outline-button" aria-expanded="${state.graphOpen}">${state.graphOpen?"Hide connections":"Explore connections"} (${direct.length})</button></div><p class="record-id">${esc(n.id)} · ${esc(n.identity_policy||"Identity scope not separately indexed")}</p></div>
    <div class="record-body"><section class="detail-section"><h3>Source and exact location</h3>${refs.length?refs.slice(0,5).map(ref=>sourceLine(ref)).join(""):noData("Source reference not yet indexed on this record.")}${refs.length>5?`<details><summary>Show ${refs.length-5} more source locations</summary>${refs.slice(5).map(ref=>sourceLine(ref)).join("")}</details>`:""}</section>
    ${window.AtlasResearchNotes?.render(state.researchNotes.get(n.id),{mismatch:state.researchNoteMismatch})||""}
    ${meaningfulContent(n)}
    ${renderCrossDomainLeads(n)}
    <section class="detail-section"><h3>Four verification questions</h3>${renderAssessments(n)}<p class="status-note">A record state or Lean proof does not answer all four questions. Each result applies only to its stated scope.</p>${n.state==="MACHINE_CHECKED"&&!AXES[0].dimensions.some(d=>(n.assessments||[]).some(a=>a.dimension===d))?`<p class="status-note"><strong>Legacy state:</strong> machine checked is recorded, but no scoped formal-check assessment is indexed on this card. Inspect the underlying audit before relying on it.</p>`:""}${otherAssess.length?`<details><summary>Other scoped assessments (${otherAssess.length})</summary>${otherAssess.map(assessmentDetails).join("")}</details>`:""}</section>
    <section class="detail-section"><h3>Assumptions</h3>${listItems(n.assumptions,"No separate assumption text is indexed here; this is not evidence that the source has none.")}${prereqs.length?`<p><strong>Recorded prerequisite links:</strong></p><ul>${prereqs.map(e=>`<li>${esc(pretty(e.relation))} → ${esc(nodeFor(e.target)?.title||e.target)} <span class="state-label ${recordStateClass(e.state)}">${esc(pretty(e.state))}</span></li>`).join("")}</ul>`:""}</section>
    <section class="detail-section"><h3>Open obligations</h3>${listItems(n.open_obligations,"No separate obligation text is indexed on this record.")}${obligatedLinks.length?`<p><strong>On direct links:</strong></p><ul>${obligatedLinks.slice(0,3).map(e=>`<li><strong>${esc(e.id)} · ${esc(pretty(e.relation))}:</strong> ${esc(short(e.open_obligations.filter(Boolean).join("; "),280))}</li>`).join("")}</ul>${obligatedLinks.length>3?`<p>${obligatedLinks.length-3} further link(s) have recorded obligations; inspect the link list.</p>`:""}`:""}</section>
    ${n.notes?.length?`<section class="detail-section"><h3>Source notes</h3>${listItems(n.notes,"")}</section>`:""}
    <section class="detail-section"><div class="link-summary"><h3>Direct recorded links</h3><span class="link-count">${direct.length.toLocaleString()} links</span></div>${direct.length?`<p>Inspect a link's direction, source, scope, conditions, and review state before drawing an inference.</p>`:noData("No direct links are indexed on this record.")}${state.graphOpen?renderConnections(n,direct):""}</section>
    <details class="detail-section"><summary>Technical record details</summary><p><strong>Stored record type:</strong> ${esc(n.type||"Not indexed")}</p><p><strong>Namespace:</strong> ${esc(n.namespace||"Not indexed")}</p><p><strong>Knowledge kind:</strong> ${esc(n.epistemic_type||"Not classified")}</p><p><strong>Acquisition method:</strong> ${esc(n.acquisition_method||"Not recorded")}</p><p><strong>Scope:</strong> ${esc(n.core_scope||"Not separately recorded")}</p>${n.formal_declaration?`<p><strong>Lean declaration:</strong> ${esc(n.formal_declaration)}</p>`:""}<p><strong>Stored domain fields</strong></p>${typedPayload||noData("No domain-specific fields indexed in this view.")}</details></div>`;
  $("close-record").addEventListener("click",()=>{state.selected="";state.graphOpen=false;state.chosenEdge="";panel.hidden=true;setRoute();renderResults()});
  $("save-record").addEventListener("click",()=>toggleSaved(n.id));
  panel.querySelectorAll("[data-evidence-record]").forEach(button=>button.addEventListener("click",()=>selectRecord(button.dataset.evidenceRecord)));
  panel.querySelectorAll("[data-search-lead]").forEach(button=>button.addEventListener("click",()=>{
    clearProblemRoute();
    state.query=button.dataset.searchLead;state.selected="";state.graphOpen=false;state.visible=12;
    state.type="";state.recordState="";$("type-filter").value="";$("state-filter").value="";
    $("search-input").value=state.query;renderResults();setRoute();
    $("results-anchor").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth"});
  }));
  $("toggle-connections").addEventListener("click",()=>{
    state.graphOpen=!state.graphOpen;state.chosenEdge="";renderRecord();
    if(state.graphOpen) {
      const target=panel.querySelector(".connection-view");
      const behavior=matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth";
      if(matchMedia("(max-width:800px)").matches) target?.scrollIntoView({block:"start",behavior});
      else if(target) panel.scrollTo({top:panel.scrollTop+target.getBoundingClientRect().top-panel.getBoundingClientRect().top-16,behavior});
    }
  });
  if(state.graphOpen) wireConnections(n,direct);
}
function selectRecord(id) {
  if(state.mismatch||!nodeFor(id)) return;
  state.selected=id;state.graphOpen=false;state.graphMode="graph";state.linkPage=0;state.chosenEdge="";state.view="search";
  showView("search",false);setRoute();renderResults();
  if(matchMedia("(max-width:800px)").matches) $("record-panel").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth",block:"start"});
}

function sortedConnections(edges) {
  const priority={HUMAN_REVIEWED:0,MACHINE_CHECKED:1,SOURCE_ANCHORED:2,RECORDED:3,OPEN:4,PROPOSED:5,MACHINE_EXTRACTED:6};
  return [...edges].sort((a,b)=>(priority[a.state]??7)-(priority[b.state]??7)||a.id.localeCompare(b.id));
}
function edgeOther(edge,id) {return nodeFor(edge.source===id?edge.target:edge.source);}
function isReviewedEdge(edge) {
  if(edge.state==="HUMAN_REVIEWED") return true;
  const event=state.data.review_events?.find(item=>item.id===edge.review_event_id);
  return Boolean(event?.relation_assessment?.result==="PASS");
}
function hasFormalPass(node) {
  return Boolean((node?.assessments||[]).some(a=>["FORMAL_CHECK","LEAN_KERNEL_CHECK"].includes(a.dimension)&&a.result==="PASS"));
}
function renderConnections(node,allEdges) {
  const ordered=sortedConnections(allEdges);
  const pages=Math.max(1,Math.ceil(ordered.length/12));
  state.linkPage=Math.min(state.linkPage,pages-1);
  const edges=state.graphMode==="graph"?ordered.slice(0,12):ordered.slice(state.linkPage*12,(state.linkPage+1)*12);
  if(!edges.length) return "";
  const list=`<div class="link-list">${edges.map(e=>`<button type="button" class="link-button ${state.chosenEdge===e.id?"active":""}" data-edge="${esc(e.id)}"><strong>${esc(short(edgeOther(e,node.id)?.title||"Record",58))}</strong><br>${esc(pretty(e.relation))} · ${esc(pretty(e.state||"Unassessed"))}</button>`).join("")}</div>`;
  const paging=state.graphMode==="list"&&pages>1?`<div class="link-paging"><button type="button" id="previous-links" ${state.linkPage===0?"disabled":""}>← Previous</button><span>Page ${state.linkPage+1} of ${pages}</span><button type="button" id="next-links" ${state.linkPage===pages-1?"disabled":""}>Next →</button></div>`:"";
  const showing=state.graphMode==="graph"?`Showing ${edges.length} of ${allEdges.length.toLocaleString()} direct links in the graph. Switch to List to browse all.`:`Showing ${state.linkPage*12+1}–${state.linkPage*12+edges.length} of ${allEdges.length.toLocaleString()} direct links.`;
  return `<div class="connection-view"><div class="connection-tabs"><button type="button" data-graph-mode="graph" aria-pressed="${state.graphMode==="graph"}">Graph</button><button type="button" data-graph-mode="list" aria-pressed="${state.graphMode==="list"}">All links · List</button></div>${state.graphMode==="graph"?`<div id="graph-stage" class="graph-stage">${graphSVG(node,edges)}</div><div class="graph-legend"><span><i></i> Scoped review recorded</span><span><i class="dashed"></i> Other recorded / proposed</span><span>◯ Exact formal PASS</span></div>${list}`:list}${paging}<p class="status-note">${showing} Equal-size nodes; line style is a review cue, not a truth score.</p><div id="edge-inspector" class="edge-inspector" aria-live="polite">${state.chosenEdge?edgeDetails(allEdges.find(e=>e.id===state.chosenEdge)):"Choose a link to inspect its source and conditions."}</div></div>`;
}
function graphSVG(focus,edges) {
  const otherIds=[...new Set(edges.map(e=>e.source===focus.id?e.target:e.source))];
  const positions=new Map([[focus.id,[220,150]]]);
  otherIds.forEach((id,index)=>{const angle=2*Math.PI*index/otherIds.length-Math.PI/2;positions.set(id,[220+152*Math.cos(angle),150+105*Math.sin(angle)]);});
  const edgeLines=edges.map(e=>{const a=positions.get(e.source),b=positions.get(e.target);if(!a||!b)return "";const tentative=!isReviewedEdge(e);return `<path class="graph-edge ${tentative?"tentative":""}" d="M${a[0]},${a[1]} L${b[0]},${b[1]}" data-edge="${esc(e.id)}" role="button" tabindex="0" aria-label="Inspect ${esc(pretty(e.relation))} link, ${esc(pretty(e.state))}"><title>${esc(e.relation)} · ${esc(e.state)}</title></path>`;}).join("");
  const nodeMarks=[focus.id,...otherIds].map(id=>{const n=nodeFor(id),[x,y]=positions.get(id);return `<g class="graph-node ${id===focus.id?"focus":""}" data-graph-node="${esc(id)}" role="button" tabindex="0" aria-label="Open ${esc(n?.title||id)}${hasFormalPass(n)?", exact formal PASS recorded":""}">${hasFormalPass(n)?`<circle class="formal-ring" cx="${x}" cy="${y}" r="16"/>`:""}<circle cx="${x}" cy="${y}" r="11"/><text x="${x}" y="${y+26}" text-anchor="middle">${esc(short(n?.title||id,25))}</text></g>`;}).join("");
  return `<svg viewBox="0 0 440 300" role="group" aria-label="Twelve or fewer direct recorded links around ${esc(focus.title)}">${edgeLines}${nodeMarks}</svg>`;
}
function edgeDetails(e) {
  if(!e) return "Choose a link to inspect its source and conditions.";
  const source=nodeFor(e.source)?.title||e.source,target=nodeFor(e.target)?.title||e.target;
  const refs=e.source_refs||[];const review=(e.assessments||[]).map(a=>`${a.dimension}: ${a.result}${a.scope?` · ${a.scope}`:""}`).join("; ");
  const event=state.data.review_events?.find(event=>event.id===e.review_event_id);
  const reviewText=[review,event?`Review event ${event.id}; ${event.relation_assessment?.result||"result not indexed"}; ${event.scope||"scope not indexed"}`:""].filter(Boolean).join("; ") || "No scoped review indexed";
  const neighbor=edgeOther(e,state.selected);
  const sources=refs.map(ref=>{const item=sourceFor(ref),href=safeHref(item?.href),label=esc(item?.title||ref.source_id);return `${href?`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`:label} · ${esc(ref.locator||"exact location not indexed")}`;}).join("<br>");
  return `<h4>${esc(pretty(e.relation))} · ${esc(pretty(e.state||"Unassessed"))}</h4><p><strong>Direction:</strong> ${esc(source)} → ${esc(target)}</p>${e.disposition&&e.disposition!=="UNASSESSED"?`<p><strong>Disposition:</strong> ${esc(pretty(e.disposition))}</p>`:""}<p><strong>Scope:</strong> ${esc(e.scope||"Not separately indexed")}</p><p><strong>Rationale:</strong> ${esc(e.rationale||"Not separately indexed")}</p><p><strong>Source:</strong> ${sources||"Exact source span not indexed on this link"}</p><p><strong>Review:</strong> ${esc(reviewText)}</p>${(e.assessments||[]).map(assessmentDetails).join("")}<p><strong>Conditions:</strong> ${esc(e.conditions?.length?e.conditions.join("; "):"Not separately indexed")}</p><p><strong>Open obligations:</strong> ${esc(e.open_obligations?.length?e.open_obligations.join("; "):"Not separately indexed on this link")}</p><p>A graph path is navigation; it is not a valid composed argument.</p>${neighbor?`<button type="button" class="text-link" data-open-neighbor="${esc(neighbor.id)}">Open ${esc(short(neighbor.title,45))} →</button>`:""}`;
}
function wireConnections(node,allEdges) {
  document.querySelectorAll("[data-graph-mode]").forEach(button=>button.addEventListener("click",()=>{state.graphMode=button.dataset.graphMode;renderRecord()}));
  for(const [id,step] of [["previous-links",-1],["next-links",1]]) {
    $(id)?.addEventListener("click",()=>{state.linkPage+=step;state.chosenEdge="";renderRecord();});
  }
  $("record-panel").querySelectorAll("[data-edge]").forEach(element=>{
    const choose=()=>{state.chosenEdge=element.dataset.edge;const box=$("edge-inspector");box.innerHTML=edgeDetails(allEdges.find(e=>e.id===state.chosenEdge));$("record-panel").querySelectorAll(".link-button").forEach(b=>b.classList.toggle("active",b.dataset.edge===state.chosenEdge));};
    element.addEventListener("click",choose);
    if(element.tagName.toLowerCase()!=="button") element.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();choose();}});
  });
  $("record-panel").querySelectorAll("[data-graph-node]").forEach(element=>{
    const open=()=>selectRecord(element.dataset.graphNode);
    element.addEventListener("click",open);element.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();open();}});
  });
  $("edge-inspector").addEventListener("click",event=>{const button=event.target.closest("[data-open-neighbor],[data-evidence-record]");if(button)selectRecord(button.dataset.openNeighbor||button.dataset.evidenceRecord);});
}

function restoreSaved() {
  try {const parsed=JSON.parse(localStorage.getItem(storageKey())||"[]");if(Array.isArray(parsed))state.saved=new Set(parsed.filter(id=>typeof id==="string"&&nodeFor(id)));}catch {state.saved=new Set();}
  updateSavedCount();
}
function persistSaved() {try {localStorage.setItem(storageKey(),JSON.stringify([...state.saved]));}catch {}updateSavedCount();}
function updateSavedCount() {$("saved-count").textContent=state.saved.size;}
function toggleSaved(id) {state.saved.has(id)?state.saved.delete(id):state.saved.add(id);persistSaved();renderRecord();}
function renderSaved() {
  const list=$("saved-list");
  const ids=[...state.saved].sort((a,b)=>(nodeFor(a)?.title||a).localeCompare(nodeFor(b)?.title||b));
  list.innerHTML=ids.length?ids.map(id=>`<div class="saved-item"><button type="button" data-saved-open="${esc(id)}">${esc(nodeFor(id)?.title||id)}<small>${esc(id)}</small></button><button type="button" class="remove-saved" data-saved-remove="${esc(id)}" aria-label="Remove ${esc(nodeFor(id)?.title||id)}">Remove</button></div>`).join(""):`<div class="empty-state">No records saved yet. Open a result and choose “Save record”.</div>`;
  list.querySelectorAll("[data-saved-open]").forEach(button=>button.addEventListener("click",()=>{$("saved-dialog").close();selectRecord(button.dataset.savedOpen)}));
  list.querySelectorAll("[data-saved-remove]").forEach(button=>button.addEventListener("click",()=>{state.saved.delete(button.dataset.savedRemove);persistSaved();renderSaved();if(state.selected)renderRecord()}));
  $("export-json").disabled=!ids.length;$("export-markdown").disabled=!ids.length;$("saved-clear").disabled=!ids.length;
}
function download(name,content,type) {const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function collectionPayload() {return {schema:"ASRA-COLLECTION-v1",snapshot_id:snapshotId(),source_commit:state.data.snapshot.source_commit,record_ids:[...state.saved].sort()};}
function exportCollection(kind) {
  const payload=collectionPayload();
  if(kind==="json") download("atlas-collection.json",JSON.stringify(payload,null,2)+"\n","application/json");
  else download("atlas-collection.md",`# AI Safety Research Atlas collection\n\nSnapshot: \`${payload.snapshot_id}\`  \nSource commit: \`${payload.source_commit}\`\n\nThis export contains atlas record IDs. Open it against the pinned snapshot before using the records.\n\n${payload.record_ids.map(id=>`- \`${id}\``).join("\n")}\n`,"text/markdown");
}
async function importCollection(file) {
  const status=$("import-message");status.classList.remove("error");
  try {
    if(!file||file.size>1_000_000) throw new Error("Choose a JSON collection smaller than 1 MB.");
    const parsed=JSON.parse(await file.text());
    if(parsed?.schema!=="ASRA-COLLECTION-v1"||!Array.isArray(parsed.record_ids)||parsed.record_ids.some(id=>typeof id!=="string")) throw new Error("This is not a compatible atlas collection export.");
    if(parsed.snapshot_id!==snapshotId()) throw new Error("Snapshot mismatch: no IDs were imported. Open the export against its pinned snapshot.");
    const missing=parsed.record_ids.filter(id=>!nodeFor(id));if(missing.length) throw new Error(`${missing.length} record ID(s) are absent from this snapshot; nothing was imported.`);
    parsed.record_ids.forEach(id=>state.saved.add(id));persistSaved();renderSaved();status.textContent=`Imported ${parsed.record_ids.length} IDs for this snapshot.`;
  } catch(error) {status.classList.add("error");status.textContent=error.message||"The collection could not be imported.";}
}

function fillFilters() {
  const types=[...new Set(state.data.nodes.map(n=>typeGroup(n.type)).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const states=[...new Set(state.data.nodes.map(n=>n.state).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  $("type-filter").insertAdjacentHTML("beforeend",types.map(type=>`<option value="${esc(type)}">${esc(pretty(type))}</option>`).join(""));
  $("state-filter").insertAdjacentHTML("beforeend",states.map(value=>`<option value="${esc(value)}">${esc(pretty(value))}</option>`).join(""));
}
function wire() {
  document.querySelectorAll("[data-view-link]").forEach(link=>link.addEventListener("click",event=>{event.preventDefault();showView(link.dataset.viewLink)}));
  $("search-form").addEventListener("submit",event=>{event.preventDefault();clearProblemRoute();state.query=$("search-input").value.trim();state.visible=12;state.selected="";state.graphOpen=false;renderResults();setRoute();$("results-anchor").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth"})});
  let timer;$("search-input").addEventListener("input",event=>{clearTimeout(timer);timer=setTimeout(()=>{clearProblemRoute();state.query=event.target.value.trim();state.visible=12;state.selected="";state.graphOpen=false;renderResults();setRoute({replace:true});},170)});
  document.querySelectorAll("[data-example-query]").forEach(button=>button.addEventListener("click",()=>{clearProblemRoute();$("search-input").value=button.dataset.exampleQuery;state.query=button.dataset.exampleQuery;state.visible=12;state.selected="";renderResults();setRoute();$("results-anchor").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth"})}));
  $("problem-starters").addEventListener("click",event=>{const button=event.target.closest("[data-problem-route]");if(button)openProblemRoute(button.dataset.problemRoute);});
  $("problem-route-panel").addEventListener("click",event=>{
    if(event.target.closest("[data-clear-problem]")){clearProblemRoute();state.selected="";renderResults();setRoute();return;}
    const stage=event.target.closest("[data-route-stage]"),branch=event.target.closest("[data-route-branch]"),link=event.target.closest("[data-route-edge]");
    if(stage||branch){if(stage)state.problemStage=stage.dataset.routeStage;if(branch)state.knowledgeBranch=branch.dataset.routeBranch;state.selected="";state.visible=12;state.graphOpen=false;state.type="";state.recordState="";$("type-filter").value="";$("state-filter").value="";renderResults();setRoute();return;}
    if(link){const edge=state.data.edges.find(e=>e.id===link.dataset.routeEdge);if(!edge)return;state.selected=edge.source;state.graphOpen=true;state.graphMode="list";state.chosenEdge=edge.id;state.linkPage=Math.floor(sortedConnections(state.incidents.get(edge.source)||[]).findIndex(e=>e.id===edge.id)/12);renderResults();setRoute();if(matchMedia("(max-width:800px)").matches)$("record-panel").scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth"});}
  });
  $("type-filter").addEventListener("change",event=>{state.type=event.target.value;state.visible=12;renderResults()});
  $("state-filter").addEventListener("change",event=>{state.recordState=event.target.value;state.visible=12;renderResults()});
  $("more-results").addEventListener("click",()=>{state.visible+=24;renderResults()});
  $("meaning-search").addEventListener("click",searchMeaning);
  $("literature-search").addEventListener("click",searchLiterature);
  $("saved-trigger").addEventListener("click",()=>{renderSaved();$("saved-dialog").showModal()});
  $("saved-close").addEventListener("click",()=>$("saved-dialog").close());
  $("export-json").addEventListener("click",()=>exportCollection("json"));$("export-markdown").addEventListener("click",()=>exportCollection("md"));
  $("import-file").addEventListener("change",event=>{importCollection(event.target.files?.[0]);event.target.value=""});
  $("saved-clear").addEventListener("click",()=>{state.saved.clear();persistSaved();renderSaved();if(state.selected)renderRecord()});
  $("paper-file").addEventListener("change",event=>{$("paper-file-note").textContent=event.target.files?.length?`Selected locally: ${event.target.files[0].name}. No upload or analysis has run.`:"Your file stays on this device; selection only displays its name."});
  $("paper-example-open").addEventListener("click",()=>{clearProblemRoute();state.query="debate";$("search-input").value=state.query;selectRecord("PAPER-THM-6.2")});
  $("use-current-snapshot").addEventListener("click",()=>{state.mismatch=false;$("snapshot-mismatch").hidden=true;setSnapshotBlocked(false);setRoute({replace:true});renderResults()});
  window.addEventListener("popstate",()=>{if(state.data)applyURL()});
  window.addEventListener("keydown",event=>{if(event.key==="/"&&!/input|textarea|select/i.test(document.activeElement?.tagName||"")){event.preventDefault();showView("search");$("search-input").focus();}});
}
async function init() {
  wire();
  try {
    if(!window.AtlasConceptSearch) throw new Error("The existing atlas search module did not load.");
    const response=await fetch("./atlas_data.json",{cache:"no-store"});if(!response.ok)throw new Error(`Atlas data: HTTP ${response.status}`);
    const data=await response.json();
    if(!data?.snapshot?.id||!Array.isArray(data.nodes)||!Array.isArray(data.edges)||!Array.isArray(data.sources))throw new Error("The validated atlas export has an unexpected format.");
    state.data=data;state.nodes=new Map(data.nodes.map(n=>[n.id,n]));state.sources=new Map(data.sources.map(s=>[s.id,s]));
    try {
      const routeResponse=await fetch("./problem_routes.json",{cache:"no-store"});
      if(routeResponse.ok&&window.AtlasProblemRoutes){
        const raw=await routeResponse.text();state.problemRoutes=AtlasProblemRoutes.attach(JSON.parse(raw),data);
        const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
        state.problemRoutePin=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
      }
    }catch { /* An unpinned route never opens; ordinary record search still works. */ }
    if(capability("cross_domain_leads")) try {
      const leadResponse=await fetch("./cross_domain_leads.json",{cache:"no-store"});
      if(leadResponse.ok) {
        const raw=await leadResponse.text();
        const overlay=JSON.parse(raw);
        if(overlay.schema==="ASRA-SOURCE-PINNED-RESEARCH-LEADS-v1" && overlay.status==="PROPOSED" && overlay.source_commit===data.snapshot.source_commit && overlay.atlas_snapshot_id===data.snapshot.id && Array.isArray(overlay.examples)) {
          const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
          state.crossDomainLeads=new Map(overlay.examples.filter(item=>state.nodes.has(item.anchor_record_id) && Array.isArray(item.leads)).map(item=>[item.anchor_record_id,item]));
          state.crossDomainVersion=overlay.overlay_version;
          state.crossDomainPin=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
        }
      }
    } catch { /* This optional proposal layer fails closed; atlas cards still work. */ }
    try {
      const notesResponse=await fetch("./research_notes/cards.json",{cache:"no-store"});
      if(notesResponse.ok && window.AtlasResearchNotes) {
        const raw=await notesResponse.text();
        const cards=AtlasResearchNotes.attach(JSON.parse(raw),data);
        const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
        state.researchNotes=cards;
        state.researchNotePin=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
      }
    } catch { /* Optional notes fail closed; canonical records remain inspectable. */ }
    try {
      const pilotResponse=await fetch("./paper-pilot/summary.json",{cache:"no-store"});
      if(pilotResponse.ok) {
        const raw=await pilotResponse.text(),pilot=JSON.parse(raw);
        if(pilot.schema!=="AAIS-E003-LOCAL-PAPER-PILOT-v1"||pilot.paper_id!=="arXiv:2311.14125v1"||pilot.lean_passed!==true||pilot.source_recheck_exit_code!==0||pilot.e003_status!=="OPEN_UNCHANGED"||pilot.paper_to_lean_fidelity!=="AI_DRAFT; HUMAN_SOURCE_REVIEW_PENDING"||pilot.new_mathematical_progress!==false||pilot.canonical_atlas_mutated!==false||!pilot.source_spans?.T62||!pilot.axioms_reported) throw Error("Pilot receipt outside this display's scope.");
        const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
        state.paperPilot=pilot;state.paperPilotPin=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
      }
    } catch { /* The unverified optional receipt remains hidden. */ }
    try {
      const reviewResponse=await fetch("./paper-pilot/review_packet.json",{cache:"no-store"});
      if(reviewResponse.ok&&window.AtlasReviewCard) {
        const raw=await reviewResponse.text();
        const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
        renderReviewCard(AtlasReviewCard.validatePacket(JSON.parse(raw)),Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join(""));
      }
    } catch { /* An unverified review packet stays hidden. */ }
    state.incidents=new Map(data.nodes.map(n=>[n.id,[]]));for(const edge of data.edges){state.incidents.get(edge.source)?.push(edge);if(edge.target!==edge.source)state.incidents.get(edge.target)?.push(edge);}
    fillFilters();restoreSaved();applyURL();
    $("snapshot-label").textContent=`Snapshot ${data.snapshot.id.slice(0,8)} · ${data.counts.nodes.toLocaleString()} indexed records`;
    $("footer-counts").textContent=`${data.counts.edges.toLocaleString()} recorded links · selected, evolving coverage`;
  } catch(error) {
    $("load-error").hidden=false;$("load-error").textContent=state.data?.public_mode?`This atlas snapshot could not be opened. Please reload the page or try again later. ${error.message}`:`Could not open this public atlas snapshot. Reload the page; if it persists, report the snapshot loading error. ${error.message}`;
    $("results-count").textContent="Snapshot unavailable";$("results-list").innerHTML="";$("snapshot-label").textContent="Snapshot unavailable";
  }
}
init();
