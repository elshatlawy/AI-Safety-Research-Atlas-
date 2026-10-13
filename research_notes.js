/* Optional source-reading notes. Never part of search ranking or canonical data. */
(function(root) {
  "use strict";
  const STATUS="AI_SOURCE_ANALYSIS_PROVISIONAL";
  const fields=[['assumptions','Assumptions'],['evidence_for','Supporting material'],['evidence_against','Challenging material'],['limitations','Limitations'],['open_questions','Open questions']];
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const href=value=>{try {const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}};
  const same=(a,b)=>a?.source_id===b?.source_id&&a?.locator===b?.locator;
  function attach(payload,data) {
    if(payload?.schema!=='ASRA-RESEARCH-CARDS-v1'||payload.status!==STATUS||payload.snapshot_id!==data?.snapshot?.id||payload.source_commit!==data.snapshot.source_commit||!Array.isArray(payload.cards)) throw Error('Research notes do not match this snapshot.');
    const nodes=new Map(data.nodes.map(n=>[n.id,n])), sources=new Set(data.sources.map(s=>s.id)), cards=new Map();
    for(const card of payload.cards) {
      const node=nodes.get(card.record_id);
      if(!node||cards.has(card.record_id)||card.status!==STATUS||card.snapshot_record_state!==node.state||!card.plain_language||!card.statement_scope||!Array.isArray(card.source_checks)||!card.source_checks.length) throw Error('Research note identity or status mismatch.');
      const checks=new Map();
      for(const check of card.source_checks) {
        const direct=check.attachment==='EXISTING_RECORDED_REF'&&check.source_id===check.source_ref?.source_id&&(node.source_refs||[]).some(ref=>same(ref,check.source_ref));
        const supplemental=check.attachment==='SUPPLEMENTAL_EXISTING_ATLAS_SOURCE'&&check.source_ref===null&&sources.has(check.source_id);
        if(!check.id||checks.has(check.id)||!check.locator||!check.inspection_basis||(!direct&&!supplemental)) throw Error('Research note source check mismatch.');
        checks.set(check.id,check);
      }
      for(const [key] of fields) {
        if(!Array.isArray(card[key])||(!card[key].length&&!card.not_indexed?.[key])) throw Error('Research note field lacks evidence or an explicit boundary.');
        for(const item of card[key]) {
          const check=checks.get(item.source_check_id);
          if(!item.text||item.basis!=='AI_SOURCE_ANALYSIS'||!check||!(node.source_refs||[]).some(ref=>same(ref,item.source_ref))||(check.attachment==='EXISTING_RECORDED_REF'&&!same(item.source_ref,check.source_ref))) throw Error('Research note item is detached from its inspected source.');
        }
      }
      cards.set(card.record_id,card);
    }
    return cards;
  }
  function render(card,{mismatch=false}={}) {
    if(mismatch) return '<section class="detail-section research-note"><h3>Research note</h3><p>This link pins another source-reading version. Its notes are not displayed. Remove the <code>note_overlay</code> parameter to deliberately open the current draft.</p></section>';
    if(!card) return '';
    const checks=new Map(card.source_checks.map(c=>[c.id,c]));
    const sections=fields.map(([key,label])=>`<h4>${label}</h4>${card[key].length?`<ul>${card[key].map(item=>`<li>${esc(item.text)}<small>Inspected span: ${esc(checks.get(item.source_check_id).source_id)} · ${esc(checks.get(item.source_check_id).locator)}</small></li>`).join('')}</ul>`:`<p class="quiet-value">${esc(card.not_indexed[key])}</p>`}`).join('');
    const sources=card.source_checks.map(c=>`<li><strong>${esc(c.source_id)}</strong><br>${href(c.url)?`<a href="${esc(href(c.url))}" target="_blank" rel="noopener noreferrer">Open pinned source ↗</a> · `:''}${esc(c.locator)}${c.attachment==='SUPPLEMENTAL_EXISTING_ATLAS_SOURCE'?' · Supplemental reading of an existing atlas source':''}<small>${esc(c.inspection_basis.replaceAll('_',' ').toLowerCase())} · ${esc(c.inspection_date)}${c.inspection_limit?` · ${esc(c.inspection_limit)}`:''}</small></li>`).join('');
    return `<section class="detail-section research-note" aria-label="AI source-reading note"><div class="research-note-head"><h3>Research note</h3><span>AI draft · source review pending</span></div><p>${esc(card.plain_language)}</p><details><summary>Assumptions, evidence and limits</summary><p><strong>Scope:</strong> ${esc(card.statement_scope)}</p>${sections}<h4>What the AI inspected</h4><ul>${sources}</ul><p class="status-note">This note is AI source analysis. The recorded statement, identity, links and four verification assessments remain unchanged. Source review of this note is still pending.</p></details></section>`;
  }
  const api={attach,render};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.AtlasResearchNotes=api;
})(typeof globalThis!=='undefined'?globalThis:this);
