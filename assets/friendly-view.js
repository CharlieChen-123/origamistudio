/* Roll-free, paper-oriented camera. Pointer coordinates use the visible canvas. */
function initFriendlyView(g) {
  const view=g.threeView, camera=view.camera, canvas=view.renderer.domElement;
  view.enableControls(false);
  let yaw=0, pitch=Math.PI/2-.001, distance=3.2, zoom=1, drag=null, enabled=true, target=[0,0,0],panMode=false;
  function update(){camera.up.set(0,1,0);camera.zoom=zoom;camera.position.set(target[0]+distance*Math.cos(pitch)*Math.sin(yaw),target[1]+distance*Math.sin(pitch),target[2]+distance*Math.cos(pitch)*Math.cos(yaw));camera.lookAt(new THREE.Vector3(...target));camera.updateProjectionMatrix();camera.updateMatrixWorld();window.dispatchEvent(new Event('foldlab:camera-change'));}
  function resize(){const r=canvas.parentElement.getBoundingClientRect();if(r.width<1||r.height<1)return;camera.aspect=r.width/r.height;view.renderer.setSize(r.width,r.height);distance=2.65/Math.min(1,camera.aspect);update();}
  function top(){yaw=0;pitch=Math.PI/2-.001;zoom=1;target=[0,0,0];resize();}
  function perspective(){yaw=0;pitch=Math.PI/3;zoom=1;target=[0,0,0];resize();}
  canvas.addEventListener('pointerdown',e=>{if(!enabled||![0,1,2].includes(e.button))return;e.preventDefault();drag={x:e.clientX,y:e.clientY,pan:panMode||e.shiftKey||e.button!==0};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag||!enabled)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(drag.pan){const h=Math.max(1,canvas.getBoundingClientRect().height),scale=camera.isOrthographicCamera?(camera.top-camera.bottom)/zoom/h:2*distance*Math.tan((camera.fov||45)*Math.PI/360)/zoom/h,right=[Math.cos(yaw),0,-Math.sin(yaw)],up=[-Math.sin(pitch)*Math.sin(yaw),Math.cos(pitch),-Math.sin(pitch)*Math.cos(yaw)];target=target.map((v,i)=>v+scale*(-dx*right[i]+dy*up[i]));}
    else{yaw-=dx*.005;pitch=Math.max(-Math.PI/2+.03,Math.min(Math.PI/2-.03,pitch+dy*.005));}drag={...drag,x:e.clientX,y:e.clientY};update();});
  canvas.addEventListener('contextmenu',e=>{if(enabled)e.preventDefault();});
  canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
  canvas.addEventListener('wheel',e=>{if(!enabled)return;e.preventDefault();zoom=Math.max(.35,Math.min(5,zoom*Math.exp(-e.deltaY*.001)));update();},{passive:false});
  canvas.style.touchAction='none';
  new ResizeObserver(resize).observe(canvas.parentElement);
  view.resetCamera=top;
  const api={capture:()=>({target:[...target],zoom,yaw,pitch}),panMode:value=>{if(value!==undefined){panMode=!!value;canvas.style.cursor=panMode?'grab':'';}return panMode;},top,perspective,frame:options=>{target=options.target||target;zoom=options.zoom||zoom;yaw=options.yaw??yaw;pitch=options.pitch??pitch;resize();},fit:()=>{zoom=1;target=[0,0,0];resize();},resize,enable:v=>{enabled=v;drag=null;}};
  top();return api;
}
