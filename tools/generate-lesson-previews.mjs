// Project-owned diagrams generated from the actual tutorial material geometry.
import fs from 'node:fs';
import {makeSheet,compileActions} from '../simulator/src/action-fold.js';
import {airplaneLesson,boxLesson,rectanglePaper} from '../simulator/src/example-lessons.js';
import {craneActions} from '../simulator/src/crane-lesson.js';
import {pocketLesson,reversePractice} from '../simulator/src/pocket-lessons.js';
import {mergeCreaseHistory} from '../simulator/src/crease-history.js';
import {createPaperDisplay} from '../simulator/src/paper-display.js';
const dir=new URL('../assets/lesson-previews/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
const wrap=(content,title)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" role="img"><title>${title}</title>${content}</svg>`;
const fit=points=>{const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),lo=[Math.min(...xs),Math.min(...ys)],hi=[Math.max(...xs),Math.max(...ys)],s=Math.min(278/(hi[0]-lo[0]),198/(hi[1]-lo[1]));return p=>[160+(p[0]-(hi[0]+lo[0])/2)*s,120+(p[1]-(hi[1]+lo[1])/2)*s];};
const fmt=p=>p.map(n=>n.toFixed(2)).join(',');
for(const [name,title,l]of [['dart','Dart Airplane',airplaneLesson()],['box','Blintz Box',boxLesson()],['crane','Traditional Paper Crane',{paper:rectanglePaper(400,400),actions:craneActions({x:0,y:0,w:400,h:400})}],['pocket','Squash and open sink',pocketLesson()],['reverse','Inside reverse fold',reversePractice()]]){
 const seq=compileActions(makeSheet(l.paper),l.actions),marks=mergeCreaseHistory(seq.prepared.flatMap(p=>p.creases||[])),map=fit(l.paper.vertices_coords);
 let cp=`<polygon points="${l.paper.vertices_coords.map(p=>fmt(map(p))).join(' ')}" fill="#ffffff" stroke="#70757b" stroke-width="1.3"/>`;
 for(const c of marks){const a=map(c.a),b=map(c.b);cp+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#91969c" stroke-width="1"${c.type==='V'?' stroke-dasharray="4 2"':''}/>`;}
 fs.writeFileSync(new URL(name+'-cp.svg',dir),wrap(cp,title+' tutorial crease pattern'));
 const faces=createPaperDisplay()(seq.frames.at(-1),200),yaw=name==='dart'?1.1:.65,pitch=.6,project=p=>{const [x,y,z]=p;return [Math.cos(yaw)*x-Math.sin(yaw)*y,Math.sin(pitch)*(Math.sin(yaw)*x+Math.cos(yaw)*y)-Math.cos(pitch)*z,Math.cos(pitch)*(Math.sin(yaw)*x+Math.cos(yaw)*y)+Math.sin(pitch)*z];},map3=fit(faces.flatMap(f=>f.vertices.map(v=>project(v.p))));
 let model='';const projected=faces.map(f=>{const pts=f.vertices.map(v=>project(v.p));return {f,pts,depth:pts.reduce((n,p)=>n+p[2],0)/pts.length};}).sort((a,b)=>a.depth-b.depth);
 // One white paper stock. Light follows each face normal, never its side.
 for(const {pts}of projected){const a=pts[0],b=pts[1].map((v,i)=>v-a[i]),c=pts[2].map((v,i)=>v-a[i]),n=[b[1]*c[2]-b[2]*c[1],b[2]*c[0]-b[0]*c[2],b[0]*c[1]-b[1]*c[0]],length=Math.hypot(...n),light=length?Math.abs((n[0]*-.35+n[1]*-.5+n[2]*.79)/length):1,shade=Math.round(241+14*Math.min(1,light)),fill=`rgb(${shade},${shade},${shade})`;model+=`<polygon points="${pts.map(p=>fmt(map3(p))).join(' ')}" fill="${fill}" stroke="#92979d" stroke-width=".6" stroke-linejoin="round"/>`;}
 fs.writeFileSync(new URL(name+'-model.svg',dir),wrap(`<defs><filter id="paper-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#202020" flood-opacity=".08"/></filter></defs><g filter="url(#paper-shadow)">${model}</g>`,title+' folded 3D model'));
}
console.log('Generated 10 tutorial preview SVGs from lesson geometry.');

