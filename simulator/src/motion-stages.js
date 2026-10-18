const recipes={
  reverse:[['open','Open the packet',0,.4,'Ease the connected walls apart. Keep their shared spine together.'],['invert','Turn the tip inward',.4,.76,'Guide the tip between the walls.'],['close','Close the packet',.76,1,'Bring the walls together around the new hinge.']],
  petal:[['open','Lift the pocket',0,.3,'Lift the open tip and let the side folds move.'],['shape','Tuck the sides',.3,.76,'Guide both side pockets inward.'],['close','Flatten',.76,1,'Flatten the long diamond.']],
  squash:[['open','Open both pockets',0,.28,'Ease the two symmetric pockets open together.'],['spread','Spread and lower',.28,.75,'Let the diagonal hinges guide the sides outward.'],['close','Flatten the base',.75,1,'Bring the layers into a triangular waterbomb base.']],
  openSink:[['open','Open to the sink rim',0,.45,'Open the base along its hinges, exposing the square rim.'],['invert','Push the center inside',.45,.72,'Reverse the central cap while the rim stays connected.'],['close','Close around the sink',.72,1,'Close the surrounding pockets. The center remains inside.']]
};
export function motionStages(action){
  const recipe=recipes[action?.template];if(!recipe)return [];
  const saved=action.stages;
  if(saved!==undefined&&(!Array.isArray(saved)||saved.length!==recipe.length))throw Error('This motion needs three teaching stages.');
  if(saved?.some(s=>!s||typeof s!=='object'||(s.instruction!==undefined&&typeof s.instruction!=='string')))throw Error('Each teaching stage needs a text instruction and duration.');
  const weights=recipe.map((r,i)=>saved?.[i]?.duration??(action.duration||6)*(r[3]-r[2]));
  if(weights.some(v=>!Number.isFinite(v)||v<.1||v>60))throw Error('Use a stage duration between 0.1 and 60 seconds.');
  const total=weights.reduce((s,v)=>s+v,0);let at=0;
  return recipe.map(([id,title,motionStart,motionEnd,instruction],i)=>{
    const start=at/total;at+=weights[i];return {id,title,instruction:saved?.[i]?.instruction??instruction,duration:weights[i],pauseAfter:!!saved?.[i]?.pauseAfter,motionStart,motionEnd,start,end:at/total};
  });
}
export function motionProgress(action,t){
  const stages=motionStages(action);if(!stages.length)return t;
  const s=stages.find(s=>t<s.end)||stages.at(-1),u=Math.max(0,Math.min(1,(t-s.start)/(s.end-s.start)));
  return s.motionStart+(s.motionEnd-s.motionStart)*u;
}
export function motionDuration(action){const stages=motionStages(action);return stages.length?stages.reduce((s,v)=>s+v.duration,0):action?.duration||3.2;}
export function stageAt(action,t,paused=false){const stages=motionStages(action);return stages.find(s=>paused?t<=s.end+1e-8:t<s.end-1e-8)||stages.at(-1);}
export function nextStageStop(action,from,to){return motionStages(action).find(s=>s.pauseAfter&&s.end>from+1e-8&&s.end<=to+1e-8)?.end;}
// Include each stage even if the author gives it a very short playback time.
export function motionSampleTimes(action,base=[]){return [...new Set([...base,...motionStages(action).flatMap(s=>[s.start,s.start+(s.end-s.start)*.02,(s.start+s.end)/2,s.end])])].sort((a,b)=>a-b);}
