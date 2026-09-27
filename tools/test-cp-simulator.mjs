// Browser integration regression: start an isolated Chrome with --remote-debugging-port=9333.
// Run node tools/serve.mjs 8123, then node tools/test-cp-simulator.mjs [CDP port].
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const port=Number(process.argv[2]||9333);
const list=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target=list.find(t=>t.type==='page');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let next=0;const pending=new Map(),errors=[];
ws.onmessage=event=>{
  const m=JSON.parse(event.data);
  if(m.id){const job=pending.get(m.id);if(job){clearTimeout(job.timer);pending.delete(m.id);m.error?job.reject(Error(m.error.message)):job.resolve(m.result);}}
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
};
function send(method,params={}) {return new Promise((resolve,reject)=>{const id=++next;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},60000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
async function until(expression){for(let i=0;i<200;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out: '+expression);}
const root=path.resolve(import.meta.dirname,'..');
let passed=0;
async function test(name,run){await run();console.log('PASS '+name);passed++;}
try {
  await send('Runtime.enable');await send('Page.enable');await send('Emulation.clearDeviceMetricsOverride');
  await send('Page.navigate',{url:'http://127.0.0.1:8123/origami-3d.html'});
  await until('window.G && window.importBusy===false && G.model.getNodes().length>0');
  await test('MIT crane loads GPU mesh',async()=>{assert.ok(await evaluate('G.model.getNodes().length')>20);});
  await test('Local CP_Crane.svg file picker imports designer colors and grouped lines',async()=>{
    const doc=await send('DOM.getDocument');const input=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#cpFile'});
    await send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[path.join(root,'assets','test-fixtures','CP_Crane.svg')]});
    await until("!importBusy && document.getElementById('modelName').textContent==='CP_Crane.svg'");
    const types=await evaluate('G.pattern.getFoldData(true).edges_assignment');
    assert.ok(types.includes('M')&&types.includes('V')&&types.includes('B'));
  });
  await test('Fold slider generates finite nonflat 3D geometry',async()=>{
    await evaluate('setFoldPercent(60)');
    await until('Array.from(G.model.getPositionsArray()).some((v,i)=>i%3===1&&Math.abs(v)>.02)');
    assert.ok(await evaluate('Array.from(G.model.getPositionsArray()).every(Number.isFinite)'));
    await new Promise(r=>setTimeout(r,2000));
    const shot=await send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(root,'screenshots/cp-simulator-import.png'),Buffer.from(shot.data,'base64'));
  });
  await test('Reset starts flat at zero',async()=>{
    await evaluate("document.getElementById('btnReset').click()");
    assert.equal(await evaluate('G.creasePercent'),0);
    await until('Array.from(G.model.getPositionsArray()).every((v,i)=>i%3!==1||Math.abs(v)<.001)');
  });
  await test('Playback pause and resume preserve percentage',async()=>{
    await evaluate("document.getElementById('btnPlay').click()");
    await until('G.creasePercent>.01');
    await evaluate("document.getElementById('btnPlay').click()");
    const p=await evaluate('G.creasePercent');
    await new Promise(r=>setTimeout(r,150));assert.equal(await evaluate('G.creasePercent'),p);
    await evaluate("document.getElementById('btnPlay').click()");
    await new Promise(r=>setTimeout(r,100));assert.ok(Math.abs(await evaluate('G.creasePercent')-p)<.1);
    await evaluate("document.getElementById('btnPlay').click()");
  });
  const simple={vertices_coords:[[0,0],[1,0],[1,1],[0,1],[.5,0],[.5,1]],edges_vertices:[[0,4],[4,1],[1,2],[2,5],[5,3],[3,0],[4,5]],edges_assignment:['B','B','B','B','B','B','V']};
  await test('Planar FOLD without faces is planarized and folded',async()=>{
    assert.equal(await evaluate(`importModelSource({name:'simple.fold',text:${JSON.stringify(JSON.stringify(simple))}})`),true);
    await evaluate('setFoldPercent(50)');await until('Array.from(G.model.getPositionsArray()).some((v,i)=>i%3===1&&Math.abs(v)>.05)');
  });
  await test('FOLD partial and zero target angles remain explicit',async()=>{
    for(const angle of [90,0]){
      const f={...simple,edges_foldAngle:[null,null,null,null,null,null,angle]};
      assert.equal(await evaluate(`importModelSource({name:'angles.fold',text:${JSON.stringify(JSON.stringify(f))}})`),true);
      const got=await evaluate('G.pattern.getFoldData(true).edges_foldAngle');assert.ok(got.includes(angle));
    }
  });
  await test('CSS inheritance, transforms, auxiliary lines and unsafe SVG content',async()=>{
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><style>.v {stroke: #3b82f6;} body {display:none}</style><g transform="translate(5,5)"><rect width="90" height="90" stroke="#ccc"/><line class="v" x1="45" y1="0" x2="45" y2="90"/><line stroke="#8b8b8b" x1="0" y1="0" x2="90" y2="90"/></g><script>parent.__unsafe=1</script><foreignObject onload="parent.__unsafe=1"/></svg>';
    assert.equal(await evaluate(`importModelSource({name:'styled.svg',text:${JSON.stringify(svg)}})`),true);
    assert.equal(await evaluate('window.__unsafe===undefined'),true);
    assert.equal(await evaluate("getComputedStyle(document.body).display!=='none'"),true);
    assert.ok(await evaluate('G.pattern.getFoldData(true).edges_assignment.includes("V")'));
  });
  await test('Malformed files report errors and can recover',async()=>{
    for(const source of [{name:'broken.svg',text:'<svg>'},{name:'broken.fold',text:'{"vertices_coords":[]}'},{name:'scan.png',text:'not a vector'}]){
      assert.equal(await evaluate(`importModelSource(${JSON.stringify(source)})`),false);
      assert.equal(await evaluate('importBusy'),false);
      assert.equal(await evaluate("document.getElementById('err').style.display"),'block');
    }
    assert.equal(await evaluate('loadModel(MIT_MODELS[13])'),true);
    assert.equal(await evaluate("document.getElementById('err').style.display"),'none');
  });
  await test('All 14 bundled OrigamiSimulator examples load',async()=>{
    for(let i=0;i<14;i++) {
      const ok=await evaluate(`loadModel(MIT_MODELS[${i}])`);
      assert.equal(ok,true,await evaluate("document.getElementById('modelName').textContent+' '+document.getElementById('err').textContent"));
      await evaluate('setFoldPercent(35)');
      await new Promise(r=>setTimeout(r,100));
      assert.ok(await evaluate('Array.from(G.model.getPositionsArray()).every(Number.isFinite)'));
    }
  });
  await test('Cleaned paper-airplane CP creates faces and a 3D state',async()=>{
    assert.equal(await evaluate('loadModel(MIT_MODELS.find(m=>m.id==="airplane"))'),true);
    assert.ok(await evaluate('G.pattern.getFoldData(true).faces_vertices.length') > 1);
    await evaluate('setFoldPercent(55)');
    await until('Array.from(G.model.getPositionsArray()).some((v,i)=>i%3===1&&Math.abs(v)>.02)');
  });
  await test('Both designers send current sheet to embedded simulator and retain edits',async()=>{
    for(const name of ['cp-designer.html','cp-designer_with constraints.html']){
      await send('Page.navigate',{url:'http://127.0.0.1:8123/'+encodeURI(name)});
      await until("typeof CPImport!=='undefined' && !!document.querySelector('.header-export button')");
      await evaluate("cp.lines=[{p1:{x:0,y:-200},p2:{x:0,y:200},lt:'valley'}];cp.paperShape='square';document.querySelector('.header-export button').click()");
      await until("document.querySelector('iframe')?.contentWindow?.G?.model?.getNodes().length>0 && document.querySelector('iframe').contentWindow.importBusy===false");
      assert.equal(await evaluate("document.querySelector('iframe').contentWindow.document.getElementById('modelName').textContent"),'CP Designer pattern.svg');
      await evaluate("document.querySelector('[role=dialog] button').click()");
      assert.equal(await evaluate('cp.lines.length'),1);
      assert.equal(await evaluate('document.querySelectorAll("iframe").length'),0);
    }
  });
  await test('Designer rectangle/hexagon clipping preserves paper boundary',async()=>{
    for(const shape of ['rect','hex']){
      const result=await evaluate(`(()=>{cp.paperShape=${JSON.stringify(shape)};cp.lines=[{p1:{x:0,y:-1000},p2:{x:0,y:1000},lt:'valley'}];return CPImport.designerSVG(cp);})()`);
      assert.ok(result.includes('polygon'));assert.ok(!result.includes('y1="-1000"'));
    }
  });
  await send('Page.navigate',{url:'http://127.0.0.1:8123/origami-3d.html'});
  await until('window.G && window.importBusy===false && G.model.getNodes().length>0');
  await test('Mobile panels and controls do not overlap',async()=>{
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    const boxes=await evaluate("['panel','threeContainer','bar'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})");
    assert.ok(boxes[0].right<=boxes[1].left);assert.ok(boxes[1].bottom<=boxes[2].top);
    const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'screenshots/cp-simulator-mobile.png'),Buffer.from(shot.data,'base64'));
    await send('Emulation.clearDeviceMetricsOverride');
  });
  assert.deepEqual(errors,[],'No uncaught browser exceptions');
  console.log(`All ${passed} browser integration checks passed.`);
} finally {ws.close();}
