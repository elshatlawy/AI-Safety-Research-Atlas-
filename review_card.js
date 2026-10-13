/* Paper-to-Lean review card. Drafts an attributed decision file; never changes atlas status. */
(function(root) {
  "use strict";
  const PACKET_SCHEMA="ASRA-PAPER-LEAN-REVIEW-PACKET-v1";
  const RESPONSE_SCHEMA="ASRA-PAPER-LEAN-REVIEW-RESPONSE-v1";
  const PROMOTE=new Set(["PROMOTE_AS_STATED","PROMOTE_WITH_CORRECTIONS"]);
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const href=value=>{try {const u=new URL(value);return u.protocol==="https:"?u.href:"";}catch{return "";}};
  const link=(url,label)=>href(url)?`<a href="${esc(href(url))}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:esc(label);
  const values=list=>new Set((list||[]).map(o=>o.value));

  function validatePacket(packet) {
    if(packet?.schema!==PACKET_SCHEMA||packet.status!=="AWAITING_MAINTAINER_DECISION"||!packet.id||!packet.candidate_edge_id) throw Error("Review packet has an unexpected format.");
    if(!Array.isArray(packet.questions)||!packet.questions.length||!packet.questions.every(q=>q.id&&q.question&&q.options?.length)) throw Error("Review packet questions are malformed.");
    if(!packet.decision?.options?.length||!Array.isArray(packet.sources_to_check)||!Array.isArray(packet.probes)) throw Error("Review packet decision or sources are malformed.");
    if(!Array.isArray(packet.blocking_rules)||!packet.blocking_rules.every(r=>r.when&&typeof r.when==="object"&&Array.isArray(r.refuses)&&r.message)) throw Error("Review packet promotion rules are malformed.");
    if(!Array.isArray(packet.settled||[])||!Array.isArray(packet.checked_examples||[])) throw Error("Review packet settled questions are malformed.");
    return packet;
  }

  // The same rules as validate_review_response.py; the repository check is authoritative.
  function problems(response,packet) {
    const found=[];
    if(!String(response.reviewer_id||"").trim()) found.push("Enter your name as the reviewer.");
    for(const q of packet.questions) if(!values(q.options).has(response.answers?.[q.id])) found.push(`Answer: ${q.question}`);
    if(!values(packet.decision.options).has(response.decision)) found.push("Choose a decision.");
    if(response.decision==="PROMOTE_WITH_CORRECTIONS"&&!String(response.corrections||"").trim()) found.push("Write the corrections to apply before promotion.");
    if(response.decision==="UNABLE_TO_ASSESS"&&!String(response.note||"").trim()) found.push("Say why you can't assess this.");
    for(const rule of packet.blocking_rules) if(rule.refuses.includes(response.decision)&&Object.entries(rule.when).every(([id,value])=>response.answers?.[id]===value)) found.push(rule.message);
    const known=new Set(packet.sources_to_check.map(s=>s.id));
    if((response.personally_checked||[]).some(id=>!known.has(id))) found.push("A checked source is not in this packet.");
    return found;
  }

  function collect(form,packet,{pin,now}) {
    const checked=packet.sources_to_check.filter(s=>form[`checked:${s.id}`]).map(s=>s.id);
    const paper=checked.some(id=>id.startsWith("paper:")), lean=checked.some(id=>id.startsWith("lean:"));
    return {
      schema:RESPONSE_SCHEMA, packet_id:packet.id, packet_sha256:pin, candidate_edge_id:packet.candidate_edge_id,
      reviewer_id:String(form.reviewer_id||"").trim(), completed_at_utc:now,
      timestamp_basis:"Reviewer's browser clock when the file was saved.",
      source_review_level:paper&&lean?"PRIMARY_SOURCES_CHECKED":"AI_DRAFT_ONLY",
      personally_checked:checked,
      answers:Object.fromEntries(packet.questions.map(q=>[q.id,form[`answer:${q.id}`]||""])),
      settled_by_lean:(packet.settled||[]).map(s=>s.id),
      decision:form.decision||"", corrections:String(form.corrections||"").trim(), note:String(form.note||"").trim(),
      ai_assistance:"Claude drafted the questions, explanations and probe summaries in this packet. The answers and decision are the reviewer's.",
      status_effect:"NONE_UNTIL_COMMITTED_BY_MAINTAINER"
    };
  }

  const EFFECT={TRANSFERS:"Lean's theorem covers it",VACUOUS:"no oracle qualifies",DOES_NOT_TRANSFER:"Lean's theorem misses a case"};
  function leanNote(packet,o) {
    if(!o.lean?.length) return o.value==="CANNOT_TELL"?"":`<small class="review-lean muted">No Lean example yet</small>`;
    const label=(id,value)=>packet.questions.find(q=>q.id===id)?.options.find(x=>x.value===value)?.label||value;
    return `<small class="review-lean">${o.lean.map(l=>`${Object.keys(l.given).length?`With “${esc(Object.entries(l.given).map(([id,v])=>label(id,v)).join("”, “"))}”: `:""}<b class="${l.effect==="TRANSFERS"?"ok":"bad"}">${esc(EFFECT[l.effect]||l.effect)}</b>`).join("<br>")} <span>· checked by Lean</span></small>`;
  }
  function render(packet) {
    const q=packet.questions.map((item,i)=>`<fieldset class="review-question"><legend><span>${String(i+1).padStart(2,"0")}</span>${esc(item.question)}</legend><p>${esc(item.why)}</p><div class="review-options${item.options.some(o=>o.lean?.length)?" review-readings":""}">${item.options.map(o=>`<label><input type="radio" name="answer:${esc(item.id)}" value="${esc(o.value)}"> <span>${esc(o.label)}${leanNote(packet,o)}</span></label>`).join("")}</div></fieldset>`).join("");
    const settled=(packet.settled||[]).length?`<section class="review-settled"><span class="step-count">SETTLED BY LEAN · NO ANSWER NEEDED</span>${packet.settled.map(s=>`<article><strong>${esc(s.question)}</strong><p>${esc(s.says)}</p></article>`).join("")}<p class="status-note">You can still disagree in the note below.</p></section>`:"";
    const examples=(packet.checked_examples||[]).filter(e=>e.checked).map(e=>`<li><strong>${esc(e.title)}</strong><small>${esc(e.says.charAt(0).toUpperCase()+e.says.slice(1))}.</small><pre class="review-code"><code>${esc(e.code)}</code></pre></li>`).join("");
    const probes=packet.probes.map(p=>`<li><strong>${link(p.href,p.title)}</strong> <span class="review-tag">${esc(p.bears_on.join(", "))}</span><small>${esc(p.what_it_shows)}</small></li>`).join("");
    const sources=packet.sources_to_check.map(s=>`<label><input type="checkbox" name="checked:${esc(s.id)}"> ${link(s.href,s.label)}</label>`).join("");
    const decision=packet.decision.options.map(o=>`<label><input type="radio" name="decision" value="${esc(o.value)}"> <span><strong>${esc(o.label)}</strong><small>${esc(o.consequence)}</small></span></label>`).join("");
    return `<div class="pilot-heading"><div><span class="step-count">REVIEW THIS MATCH</span><h2>Does the paper's theorem match the Lean proof?</h2></div><span class="literature-badge">Awaiting maintainer decision</span></div>
      ${packet.generator?`<p class="review-summary">Claude wrote ${esc(packet.generator.examples_total)} Lean examples for the open questions, and Lean checked ${packet.generator.examples_checked===packet.generator.examples_total?"all of them":esc(packet.generator.examples_checked)}. ${packet.generator.questions_settled?`${esc(packet.generator.questions_settled)} of ${esc(packet.generator.questions_settled+packet.generator.questions_asked)} questions are settled by those checks, so you answer ${esc(packet.generator.questions_asked)}.`:`You answer all ${esc(packet.generator.questions_asked)} questions.`}</p>`:""}
      <p class="review-claim"><strong>The claim:</strong> ${esc(packet.claim)}</p>
      <ul class="review-exclusions">${packet.exclusions.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
      <p class="status-note">${esc(packet.prior_decision.summary)}</p>
      <div class="review-sides"><article><span class="step-count">PAPER · ${esc(packet.definition_quote.locator)}</span><blockquote>${esc(packet.definition_quote.text)}</blockquote><p class="status-note">${esc(packet.definition_quote.prose)}</p><p>${link(packet.paper.pdf,"Open the paper")}</p></article><article><span class="step-count">LEAN · ${esc(packet.lean_counterpart.locator)}</span>${packet.lean_counterpart.code?`<pre class="review-code"><code>${esc(packet.lean_counterpart.code)}</code></pre>`:""}<p class="status-note">${esc(packet.lean_counterpart.summary)}</p><p>${link(packet.lean_counterpart.href,"Open the Lean definition")} · ${link(packet.lean.href,"Open correctness")}</p></article></div>
      <form id="review-form" class="review-form" novalidate>
        ${settled}
        ${q}
        ${examples?`<details class="review-probes"><summary>The Lean examples behind these answers (${packet.checked_examples.filter(e=>e.checked).length})</summary><ul>${examples}</ul><p class="status-note">Claude wrote each example; Lean checked it against the pinned debate code with only the standard axioms. They show what each reading implies, not which reading the paper means.</p></details>`:""}
        <details class="review-probes"><summary>Earlier checked studies of the other differences (${packet.probes.length})</summary><ul>${probes}</ul><p class="status-note">Lean-checked studies of the differences accepted on 5 October. None of them is a decision.</p></details>
        <fieldset class="review-question"><legend><span>${String(packet.questions.length+1).padStart(2,"0")}</span>${esc(packet.decision.question)}</legend><div class="review-options review-decision">${decision}</div><label class="review-text">Corrections, if any<textarea name="corrections" rows="3"></textarea></label><label class="review-text">Note (optional)<textarea name="note" rows="2"></textarea></label></fieldset>
        <fieldset class="review-question"><legend>What did you check yourself?</legend><div class="review-options review-sources">${sources}</div><label class="review-text">Your name<input name="reviewer_id" type="text" autocomplete="name"></label></fieldset>
        <div id="review-problems" class="review-problems" aria-live="polite"></div>
        <button type="submit" class="outline-button">Save decision file</button>
        <p class="status-note">Saving downloads a file to your device. Nothing is sent anywhere, and no atlas status changes until the maintainer commits the file.</p>
      </form>`;
  }

  const api={validatePacket,problems,collect,render,RESPONSE_SCHEMA};
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.AtlasReviewCard=api;
})(typeof globalThis!=="undefined"?globalThis:this);
