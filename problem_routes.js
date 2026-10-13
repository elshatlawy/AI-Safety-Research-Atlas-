(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasProblemRoutes=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const equal=(a,b)=>{
    if(a===b)return true;
    if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
    if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>equal(v,b[i]));
    const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&equal(a[k],b[k]));
  };
  const require=(ok,message)=>{if(!ok)throw Error(message);};
  const fields={nodes:['id','state','source_refs','disposition','assessments','identity_policy'],edges:['id','source','target','relation','state','scope','conditions','open_obligations','source_refs','assessments','path_eligibility','disposition','assertion_role']};
  function attach(catalog,data){
    require(catalog?.schema==='ASRA-PROBLEM-ROUTES-v1'&&catalog.status==='AI_ASSISTED_NAVIGATION_VIEW'&&catalog.basis==='EXISTING_RECORDED_LINKS','Unsupported problem-route view');
    require(catalog.required_pins?.phase1_sha256===data.pins?.phase1_sha256,'Problem-route source pin differs');
    const packs=new Map((data.pins?.native_packs||[]).map(p=>[p.file,p.sha256]));
    require(Array.isArray(catalog.required_pins.native_packs)&&catalog.required_pins.native_packs.every(p=>packs.get(p.file)===p.sha256),'Problem-route pack pins differ');
    const nodes=new Map(data.nodes.map(n=>[n.id,n])),edges=new Map(data.edges.map(e=>[e.id,e]));
    const selectedNodes=new Set(),selectedEdges=new Set();
    for(const [kind,lookup,selected] of [['nodes',nodes,selectedNodes],['edges',edges,selectedEdges]]){
      require(Array.isArray(catalog.records?.[kind]),'Missing problem-route references');
      for(const expected of catalog.records[kind]){
        require(equal(Object.keys(expected).sort(),[...fields[kind]].sort()),'Incomplete problem-route evidence guard');
        const actual=lookup.get(expected.id);
        require(actual&&!selected.has(expected.id),'Unknown or duplicate problem-route record');
        for(const key of Object.keys(expected))require(equal(actual[key]??null,expected[key]),`Problem-route ${key} changed: ${expected.id}`);
        selected.add(expected.id);
      }
    }
    for(const id of selectedEdges){const edge=edges.get(id);require(selectedNodes.has(edge.source)&&selectedNodes.has(edge.target),'Problem-route endpoint is missing');}
    const routes=new Map();
    require(Array.isArray(catalog.routes)&&catalog.routes.length>0,'Missing problem routes');
    for(const route of catalog.routes){
      require(typeof route.id==='string'&&!routes.has(route.id)&&typeof route.question==='string'&&typeof route.title==='string','Invalid problem-route identity');
      require(Array.isArray(route.stages)&&equal(route.stages.map(s=>s.id),['problem','structures','bridges','knowledge']),'Invalid problem-route stages');
      for(const stage of route.stages){
        const parts=[stage,...(stage.groups||[])];
        for(const part of parts)require(typeof part.label==='string'&&typeof part.summary==='string'&&Array.isArray(part.record_ids)&&part.record_ids.every(id=>selectedNodes.has(id))&&Array.isArray(part.edge_ids)&&part.edge_ids.every(id=>selectedEdges.has(id)),'Unpinned problem-route selection');
        if(stage.id==='knowledge')require(equal((stage.groups||[]).map(g=>g.id),['formal','empirical']),'Keep formal and empirical branches separate');
        else require(!stage.groups,'Unexpected problem-route branch');
      }
      routes.set(route.id,route);
    }
    return routes;
  }
  return {attach};
});
