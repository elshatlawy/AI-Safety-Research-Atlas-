/* Search the validated atlas snapshot. Only stored relations become graph links. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AtlasConceptSearch = api;
})(globalThis, function () {
  "use strict";

  function notationLike(value) {
    const original = String(value ?? "").normalize("NFC").trim();
    return /^\p{L}$/u.test(original) || /[\p{Sm}\p{Sk}!]/u.test(original) ||
      /(?:^|[^\p{L}])\p{L}\s*-\s*\p{L}(?:$|[^\p{L}])/u.test(original) ||
      /\p{L}+\(\s*\p{L}/u.test(original);
  }
  function normalize(value) {
    const original = String(value ?? "").normalize("NFC");
    const math = notationLike(original);
    return (math ? original : original.toLowerCase())
      .replace(/([\p{Sm}\p{Sk}!-])/gu, " $1 ")
      .replace(math ? /[^\p{L}\p{M}\p{N}\p{Sm}\p{Sk}!(),-]+/gu :
        /[^\p{L}\p{M}\p{N}\p{Sm}\p{Sk}!-]+/gu, " ")
      .trim().replace(/\s+/gu, " ");
  }
  function isSearchable(value) {
    const query = normalize(value);
    return Boolean(query && !/^[a-z0-9]$/.test(query));
  }
  function phraseMatch(query, value) {
    const candidate = normalize(value);
    if (!query || !candidate) return 0;
    if (candidate === query) return 3;
    if ((" " + candidate + " ").includes(" " + query + " ")) return 2;
    // Reordering tokens across a mathematical operator can reverse meaning.
    if (notationLike(query) || notationLike(value)) return 0;
    const remaining = new Map();
    for (const token of candidate.split(" ")) remaining.set(token, (remaining.get(token) || 0) + 1);
    for (const token of query.split(" ")) {
      if (!remaining.get(token)) return 0;
      remaining.set(token, remaining.get(token) - 1);
    }
    return 1;
  }
  function sourceRefs(value) {
    return (Array.isArray(value) ? value : [])
      .filter(ref => ref && typeof ref.source_id === "string" && ref.source_id)
      .map(ref => ({source_id:ref.source_id, locator:typeof ref.locator === "string" ? ref.locator : ""}));
  }
  function records(value) {
    return value instanceof Map ? [...value.values()] : Array.isArray(value) ? value : [];
  }
  function bestMatch(query, fields) {
    let best = {score:0, field:""};
    for (const [field, value, weight, source_ref] of fields) {
      const score = phraseMatch(query, value) * weight;
      if (score > best.score) best = {score, field, source_ref};
    }
    return best;
  }
  function nodeMatch(query, node, sourceById) {
    const fields = [
      ["record title", node.title, 45], ["record ID", node.id, 25],
      ["formal declaration", node.formal_declaration, 23],
      ["formal statement", node.formal_statement, 22],
      ["record summary", node.text, 18],
      ...((node.notes || []).map(note => ["record note", note, 12])),
      ...((node.domain_types || []).map(type => ["domain type", type, 9])),
    ];
    for (const ref of sourceRefs(node.source_refs)) {
      const source = sourceById.get(ref.source_id);
      if (!source) continue;
      fields.push(["cited source title", source.title, 17, ref]);
      fields.push(["cited source location", ref.locator, 15, ref]);
    }
    return bestMatch(query, fields);
  }
  function edgeMatch(query, edge) {
    return bestMatch(query, [
      ["stored link relation", edge.relation, 12],
      ["stored link scope", edge.scope, 13],
      ["stored link rationale", edge.rationale, 11],
      ...((edge.conditions || []).map(value => ["stored link condition", value, 9])),
    ]);
  }
  function search({query, nodes=[], edges=[], sources=[], aliases=[], limit=24, connectionLimit=40}) {
    const q = normalize(query);
    const empty = {records:[], connections:[], total_records:0, truncated:false, related_count:0};
    if (!isSearchable(q)) return empty;
    const nodeList = records(nodes), edgeList = records(edges);
    const nodeById = new Map(nodeList.filter(node => node && typeof node.id === "string")
      .map(node => [node.id, node]));
    const sourceById = new Map(records(sources).filter(source => source && typeof source.id === "string")
      .map(source => [source.id, source]));
    const ranked = new Map();
    for (const node of nodeList) {
      if (!node || !node.id) continue;
      const match = nodeMatch(q, node, sourceById);
      if (match.score) ranked.set(node.id, {node, score:match.score, match_kind:"RECORD", match_field:match.field,
        source_refs:match.source_ref ? [match.source_ref] : sourceRefs(node.source_refs)});
    }
    // An alias is a search entry for an existing record, not an identity claim
    // or a graph edge. Keep its review status and its own source reference.
    for (const alias of records(aliases)) {
      if (!alias || !nodeById.has(alias.record_id) || typeof alias.literal !== "string") continue;
      const score = phraseMatch(q, alias.literal) * 44;
      const previous = ranked.get(alias.record_id);
      if (!score || (previous && previous.score >= score)) continue;
      const aliasRef = sourceRefs([alias.source_ref]);
      ranked.set(alias.record_id, {
        node:nodeById.get(alias.record_id), score, match_kind:"ALIAS", match_field:"record alias",
        match_status:alias.status, alias_id:alias.id, alias_literal:alias.literal,
        alias_role:alias.role, alias_language_tag:alias.language_tag,
        match_alias:{literal:alias.literal, role:alias.role, language_tag:alias.language_tag,
          status:alias.status, source_ref:aliasRef[0] || null},
        source_refs:aliasRef,
      });
    }
    // Wording on an existing relation can lead to its endpoint records. It does
    // not generate a new relation or upgrade that relation's review status.
    for (const edge of edgeList) {
      if (!edge || !nodeById.has(edge.source) || !nodeById.has(edge.target)) continue;
      const match = edgeMatch(q, edge);
      if (!match.score) continue;
      for (const id of [edge.source, edge.target]) {
        const node = nodeById.get(id), previous = ranked.get(id);
        if (!previous || match.score > previous.score) ranked.set(id, {
          node, score:match.score, match_kind:"LINK_WORDING", match_field:match.field,
          via_edge:edge, source_refs:sourceRefs(edge.source_refs).length ? sourceRefs(edge.source_refs) : sourceRefs(node.source_refs),
        });
      }
    }
    const direct = [...ranked.values()].sort((a,b) => b.score-a.score || a.node.title.localeCompare(b.node.title) || a.node.id.localeCompare(b.node.id));
    const incident = new Map(nodeList.map(node => [node.id, []]));
    for (const edge of edgeList) {
      if (incident.has(edge.source) && incident.has(edge.target)) {
        incident.get(edge.source).push(edge);
        if (edge.target !== edge.source) incident.get(edge.target).push(edge);
      }
    }
    // Show one-step neighbors for the best matching records, using only stored
    // edges. The neighbor's own source remains visible on its result card.
    for (const entry of direct.slice(0, 8)) {
      for (const edge of incident.get(entry.node.id) || []) {
        const id = edge.source === entry.node.id ? edge.target : edge.source;
        if (ranked.has(id)) continue;
        const node = nodeById.get(id);
        ranked.set(id, {node, score:8, match_kind:"CONNECTED", match_field:"stored link",
          via_edge:edge, source_refs:sourceRefs(node.source_refs)});
      }
    }
    const all = [...ranked.values()].sort((a,b) => b.score-a.score || a.node.title.localeCompare(b.node.title) || a.node.id.localeCompare(b.node.id));
    const cap = Math.max(1, Math.floor(Number(limit) || 24));
    const edgeCap = Math.max(0, Math.floor(Number(connectionLimit) || 40));
    const page = all.slice(0, cap), ids = new Set(page.map(item => item.node.id));
    const connections = edgeList.filter(edge => edge && ids.has(edge.source) && ids.has(edge.target))
      .sort((a,b) => a.id.localeCompare(b.id)).slice(0, edgeCap);
    return {records:page, connections, total_records:all.length, truncated:all.length > cap,
      related_count:all.filter(item => item.match_kind === "CONNECTED").length};
  }
  return {normalize, isSearchable, search};
});
