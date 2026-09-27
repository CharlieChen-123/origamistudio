// Shared drawing rules for the Designer canvas and its A4 print image.
// Keep geometry untouched: consolidation is only for rendering.
(function(root){
  'use strict';

  function mergeValleys(lines){
    const groups=new Map(),other=[];
    for(const line of lines){
      if(line.lt!=='valley'){other.push(line);continue;}
      let dx=line.p2.x-line.p1.x,dy=line.p2.y-line.p1.y;
      const length=Math.hypot(dx,dy);
      if(length<1e-8)continue;
      if(dx<0||(Math.abs(dx)<1e-10&&dy<0)){dx=-dx;dy=-dy;}
      const ux=dx/length,uy=dy/length;
      const angle=Math.atan2(uy,ux);
      const offset=-uy*line.p1.x+ux*line.p1.y;
      const key=`${Math.round(angle/0.0001)}:${Math.round(offset/0.025)}`;
      const start=ux*line.p1.x+uy*line.p1.y,end=ux*line.p2.x+uy*line.p2.y;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push({start:Math.min(start,end),end:Math.max(start,end),ux,uy,offset});
    }
    for(const segments of groups.values()){
      segments.sort((a,b)=>a.start-b.start);
      let active=null;
      const emit=()=>{
        if(!active)return;
        const {ux,uy,offset,start,end}=active;
        other.push({lt:'valley',p1:{x:ux*start-uy*offset,y:uy*start+ux*offset},p2:{x:ux*end-uy*offset,y:uy*end+ux*offset}});
      };
      for(const segment of segments){
        if(active&&segment.start<=active.end+0.025)active.end=Math.max(active.end,segment.end);
        else{emit();active={...segment};}
      }
      emit();
    }
    return other;
  }

  function stroke(ctx,line,{scale=1,color,widthPx,dashPx=0,gapPx=0}){
    const dx=line.p2.x-line.p1.x,dy=line.p2.y-line.p1.y;
    const length=Math.hypot(dx,dy);
    if(length<1e-8)return;
    ctx.setLineDash?.([]);
    ctx.beginPath();
    if(dashPx>0&&gapPx>0){
      // A dash train belongs to the supporting line, not each imported fragment.
      // In particular, never squeeze a complete dash into a tiny SVG segment.
      const sign=dx<0||(Math.abs(dx)<1e-10&&dy<0)?-1:1;
      const ux=sign*dx/length,uy=sign*dy/length;
      const a=sign>0?line.p1:line.p2;
      const start=(a.x*ux+a.y*uy)*scale,end=start+length*scale;
      const period=dashPx+gapPx;
      for(let k=Math.floor(start/period);k*period<end;k++){
        const lo=Math.max(start,k*period),hi=Math.min(end,k*period+dashPx);
        if(hi<=lo)continue;
        const from=(lo-start)/scale,to=(hi-start)/scale;
        ctx.moveTo(a.x+ux*from,a.y+uy*from);
        ctx.lineTo(a.x+ux*to,a.y+uy*to);
      }
      ctx.lineCap='butt';
    }else{
      ctx.moveTo(line.p1.x,line.p1.y);
      ctx.lineTo(line.p2.x,line.p2.y);
      ctx.lineCap='round';
    }
    ctx.strokeStyle=color;
    ctx.lineWidth=widthPx/scale;
    ctx.stroke();
  }

  root.OrigamiCreaseRender={mergeValleys,stroke};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.OrigamiCreaseRender;
})(typeof window!=='undefined'?window:globalThis);
