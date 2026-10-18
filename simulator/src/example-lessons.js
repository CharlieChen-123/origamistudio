import {makeSheet,compileActions,flapCandidates,axisForMatch} from './action-fold.js';
import {axisForEdges} from './authoring-tools.js';
export function rectanglePaper(w,h){return {vertices_coords:[[0,0],[w,0],[w,h],[0,h]],faces_vertices:[[0,1,2,3]],edges_vertices:[[0,1],[1,2],[2,3],[3,0]],edges_assignment:['B','B','B','B']};}
const identity={origin:[0,0,0],u:[1,0,0],v:[0,1,0],normal:[0,0,1]};
function builder(paper){const actions=[];let sheet=makeSheet(paper);return {actions,get sheet(){return sheet;},add(a){actions.push({...a,duration:a.duration||3});sheet=compileActions(makeSheet(paper),actions).frames.at(-1);},fold(axis,side,title,caption,extra={}){this.add({kind:'fold',axis,side,angle:side*180,title,caption,...extra});},open(title){this.add({kind:'unfold',foldIndex:actions.length-1,title,caption:'Open the fold, keeping its crease.'});}};}
export function airplaneLesson(){
  const paper=rectanglePaper(210,297),b=builder(paper);
  b.fold([[105,0],[105,297]],1,'Mark the center','Fold the long edges together.');b.open('Open the sheet');
  b.fold([[0,105],[105,0]],-1,'Left corner to the center','Bring the upper left edge onto the center crease.');
  b.fold([[105,0],[210,105]],-1,'Right corner to the center','Repeat on the other side.');
  for(const [edge,title] of [[[[0,105],[105,0]],'Narrow the left side'],[[[105,0],[210,105]],'Narrow the right side']]){const a=axisForEdges(edge,[[105,0],[105,297]]);b.fold(a.axis,a.side,title,'Align the sloping outer edge with the center crease.');}
  b.fold([[105,0],[105,297]],1,'Fold the body in half','Bring the two halves together along the original center line.');
  const axis=[[105,0],[120,297]],side=-1;
  let candidates=flapCandidates(b.sheet,{axis,side,angle:-90});
  if(!candidates.length)throw Error('The airplane wing was not found.');
  // Each wing contains both the broad panel and the tucked nose flap. They
  // share a stationary body, so selecting one connected moving flap omits the other.
  b.fold(axis,side,'Open the first wing','Move both layers of the upper wing together. Keep the lower wing against the body.',{angle:-90,seeds:candidates.filter(c=>c.seed[0]<105).map(c=>c.seed)});
  candidates=flapCandidates(b.sheet,{axis,side,angle:90,plane:identity});
  b.fold(axis,side,'Open the second wing','Move both remaining wing layers together, in the opposite direction.',{angle:90,plane:identity,seeds:candidates.filter(c=>c.seed[0]>105).map(c=>c.seed)});
  return {format:'fold-lab-tutorial',version:2,title:'Classic Dart Airplane',fold:paper,paper,actions:b.actions,source:'https://www.foldnfly.com/1.html'};
}
export function boxLesson(){
  const paper=rectanglePaper(400,400),b=builder(paper);
  b.fold([[200,0],[200,400]],1,'Mark the vertical center','Align the left and right edges.');b.open('Open the first crease');
  b.fold([[0,200],[400,200]],1,'Mark the horizontal center','Align the lower and upper edges.');b.open('Open the cross');
  for(const [point,name] of [[[0,0],'upper left'],[[400,0],'upper right'],[[400,400],'lower right'],[[0,400],'lower left']]){const a=axisForMatch(point,[200,200]);b.fold(a.axis,a.side,'Bring the '+name+' corner in','Bring this corner to the center. Keep the previous flaps in place.');}
  b.add({kind:'template',template:'turn',axis:[[200,200,0],[200,200,1]],angle:45,title:'Turn the square on the table',caption:'Rotate the whole packet by 45 degrees. This changes its orientation, not its creases.'});
  const half=100*Math.SQRT2,a=half/2;
  for(const [axis,side,name] of [[[[200-a,0],[200-a,400]],1,'left'],[[[200+a,0],[200+a,400]],-1,'right'],[[[0,200-a],[400,200-a]],-1,'top'],[[[0,200+a],[400,200+a]],1,'bottom']]){b.fold(axis,side,'Precrease the '+name+' wall','Mark where this wall joins the square bottom.');b.open('Open the '+name+' wall');}
  b.add({kind:'box',baseRatio:.5,title:'Raise the four walls',caption:'Lift the four sides together. Let the paired corner triangles fold inward. This is a gusseted blintz box; the corner folds stay visible inside.',duration:6});
  return {format:'fold-lab-tutorial',version:2,title:'Blintz Box',fold:paper,paper,actions:b.actions};
}
