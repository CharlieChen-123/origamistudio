import test from 'node:test';
import assert from 'node:assert/strict';
import creaseRender from '../../assets/crease-render.js';

test('subdivided valley remains visibly dashed at small and large zoom', () => {
  const pieces=Array.from({length:50},(_,i)=>({
    lt:'valley',p1:{x:i*4,y:0},p2:{x:(i+1)*4,y:0}
  }));
  const merged=creaseRender.mergeValleys(pieces);
  assert.equal(merged.length,1);
  assert.equal(Math.round(merged[0].p2.x-merged[0].p1.x),200);

  for(const scale of [0.25,1,2]){
    const spans=[];
    const context={beginPath(){},moveTo(x){this.start=x;},lineTo(x){spans.push([this.start,x]);},stroke(){}};
    creaseRender.stroke(context,merged[0],{scale,color:'#2563EB',widthPx:2.4,dashPx:11,gapPx:8});
    assert.ok(spans.length>=2,`visible dash count at ${scale}x`);
    assert.ok(spans.every((span,i)=>i===spans.length-1||spans[i+1][0]-span[1]>=6/scale),`visible gaps at ${scale}x`);
    assert.equal(context.lineWidth*scale,2.4);
  }
});

test('tiny, reversed, and unmerged fragments share a fixed dash train without becoming dots',()=>{
  const collect=lines=>{
    const spans=[];const ctx={beginPath(){},moveTo(x){this.x=x;},lineTo(x){spans.push([this.x,x]);},stroke(){}};
    for(const line of lines)creaseRender.stroke(ctx,line,{scale:1,color:'blue',widthPx:2.4,dashPx:11,gapPx:8});
    return spans;
  };
  const full=collect([{p1:{x:-100,y:0},p2:{x:100,y:0}}]);
  const fragments=collect(Array.from({length:1000},(_,i)=>({p1:{x:-100+(i+1)*.2,y:0},p2:{x:-100+i*.2,y:0}})));
  const covered=(x,spans)=>spans.some(([a,b])=>x>=a-1e-7&&x<=b+1e-7);
  for(let x=-99.97;x<100;x+=.137)assert.equal(covered(x,full),covered(x,fragments),'dash phase at '+x);
  assert.ok(fragments.every(([a,b])=>!((a+b)/2>11&&(a+b)/2<19)),'fragments must not fill the gap');
});
