/* Roll-free, paper-oriented camera. Pointer coordinates use the visible canvas. */
function initFriendlyView(g) {
  const view=g.threeView, camera=view.camera, canvas=view.renderer.domElement;
  view.enableControls(false);
  let yaw=0, pitch=Math.PI/2-.001, distance=3.2, zoom=1, drag=null, enabled=true, target=[0,0,0];
  function update(){camera.up.set(0,1,0);camera.zoom=zoom;camera.position.set(target[0]+distance*Math.cos(pitch)*Math.sin(yaw),target[1]+distance*Math.sin(pitch),target[2]+distance*Math.cos(pitch)*Math.cos(yaw));camera.lookAt(new THREE.Vector3(...target));camera.updateProjectionMatrix();}
  function resize(){const r=canvas.parentElement.getBoundingClientRect();if(r.width<1||r.height<1)return;camera.aspect=r.width/r.height;view.renderer.setSize(r.width,r.height);distance=2.65/Math.min(1,camera.aspect);update();}
  function top(){yaw=0;pitch=Math.PI/2-.001;zoom=1;target=[0,0,0];resize();}
  function perspective(){yaw=0;pitch=Math.PI/3;zoom=1;target=[0,0,0];resize();}
  canvas.addEventListener('pointerdown',e=>{if(!enabled||e.button!==0)return;drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag||!enabled)return;yaw-=(e.clientX-drag.x)*.005;pitch=Math.max(-Math.PI/2+.03,Math.min(Math.PI/2-.03,pitch+(e.clientY-drag.y)*.005));drag={x:e.clientX,y:e.clientY};update();});
  canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
  canvas.addEventListener('wheel',e=>{if(!enabled)return;e.preventDefault();zoom=Math.max(.35,Math.min(5,zoom*Math.exp(-e.deltaY*.001)));update();},{passive:false});
  canvas.style.touchAction='none';
  new ResizeObserver(resize).observe(canvas.parentElement);
  view.resetCamera=top;
  const api={top,perspective,frame:options=>{target=options.target||target;zoom=options.zoom||zoom;yaw=options.yaw??yaw;pitch=options.pitch??pitch;resize();},fit:()=>{zoom=1;target=[0,0,0];resize();},resize,enable:v=>{enabled=v;drag=null;}};
  top();return api;
}
