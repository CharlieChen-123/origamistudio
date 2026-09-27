// Authored teaching sequence; coordinates follow the solved material geometry.
export function craneActions({x,y,w,h}){
  const cx=x+w/2,cy=y+h/2,q=w/(2*Math.SQRT2),guideY=cy-q*(Math.SQRT2-1);
  const actions=[];
  const fold=(axis,side,angle,assignment,title,caption,extra={})=>actions.push({kind:'fold',axis,side,angle,assignment,title,caption,...extra});
  const open=(title,caption)=>actions.push({kind:'unfold',foldIndex:actions.length-1,title,caption});
  fold([[x,y],[x+w,y+h]],1,180,'V','Fold the first diagonal','Start with the blue side up. Bring one corner onto the opposite corner.');
  open('Open the paper','Keep the first diagonal crease.');
  fold([[x+w,y],[x,y+h]],1,180,'V','Fold the second diagonal','Bring the other pair of opposite corners together.');
  open('Open the paper again','The two diagonal creases meet at the center.');
  fold([[x,cy],[x+w,cy]],1,-180,'M','Precrease across the middle','Fold away from you so this straight crease has the opposite direction to the diagonals.');
  open('Open the horizontal crease','Keep the paper flat.');
  fold([[cx,y],[cx,y+h]],1,-180,'M','Precrease the other middle line','Align the left and right edges, folding away from you.');
  open('Open to the prepared square','Two diagonal valleys and two straight mountains prepare the collapse.');
  actions.push({kind:'squareBase',duration:5,title:'Collapse into a square base',caption:'Keep the front quarter steady. Bring the opposite quarter underneath it while the two side pockets fold inward. All four original corners meet at the open bottom tip. The closed point is at the top.'});
  fold([[cx,cy+q],[cx-q*(2-Math.SQRT2),guideY]],-1,-180,'V','Fold the front left edge to the center','Lift only the front left flap, including its inner layer. Align its lower edge with the vertical center line.',{flapSectors:[0,1,2,7]});
  open('Open the left guide fold','Return the flap to the square base. The new guide stays on the same paper layers.');
  fold([[cx,cy+q],[cx+q*(2-Math.SQRT2),guideY]],1,180,'V','Fold the front right edge to the center','Repeat on the right front flap. Keep the back layers still.',{flapSectors:[0,1,2,7]});
  open('Open the right guide fold','The two matching guide creases prepare the front petal fold.');
  fold([[cx-q,guideY],[cx+q,guideY]],-1,-180,'V','Precrease the top triangle','Fold the closed top point down across the line joining the upper ends of the two new guides. This fold moves all the layers.');
  open('Open — ready for the petal fold','The square base and its guide creases are ready. Lift the front bottom point in the next step.');
  const a=q*(2-Math.SQRT2);
  const petal=(front,left,right,title)=>actions.push({kind:'template',template:'petal',tip:[cx,cy+q],left:[cx-q,cy],right:[cx+q,cy],hingeLeft:[cx-a,guideY],hingeRight:[cx+a,guideY],frontSectors:front,leftSectors:left,rightSectors:right,duration:6,title,caption:'Lift the bottom point of the front layer. The side pockets close along the guides while the back layers stay still. Flatten the long diamond.'});
  const turn=()=>actions.push({kind:'template',template:'turn',axis:[[cx,cy-1,0],[cx,cy+1,0]],angle:180,duration:2.5,title:'Turn the paper over',caption:'Turn the whole model over. Keep the two narrow open points at the bottom.'});
  petal([0,1],[2],[7],'Open and lift the front petal');
  turn();
  fold([[cx,cy+q],[cx-a,guideY]],-1,-180,'V','Make the left guide on the back','Fold the lower left edge to the center on this side.',{flapSectors:[4,5,6,3]});
  open('Open the left back guide','Leave a clear guide for the second petal.');
  fold([[cx,cy+q],[cx+a,guideY]],1,180,'V','Make the right guide on the back','Fold the lower right edge to the center on this side.',{flapSectors:[4,5,6,3]});
  open('Open the right back guide','The top guide already passes through the packet. Both side guides are now ready.');
  petal([4,5],[6],[3],'Lift the second petal — bird base');
  const narrow=(sectors,label)=>{
    fold([[cx,cy+q],[cx-2*q*Math.tan(Math.PI/16),cy-q]],-1,-180,'V','Narrow the left point'+label,'Fold the lower left outer edge onto the center line. Move the front layers only.',{flapSectors:sectors});
    fold([[cx,cy+q],[cx+2*q*Math.tan(Math.PI/16),cy-q]],1,180,'V','Narrow the right point'+label,'Repeat on the right lower point. Keep the broad upper flap free.',{flapSectors:sectors});
  };
  narrow([4,5,6,3],'');turn();narrow([0,1,2,7],' on this side');
  const rootY=guideY;
  actions.push({kind:'template',template:'reverse',pivot:[cx,rootY],spine:[cx,rootY+q],hinge:[cx-q,rootY+q*.42],frontSectors:[0,1,2,7],backSectors:[3,4,5,6],duration:6,title:'Inside-reverse fold the neck',caption:'Open the left side of the packet. Raise the narrow point between its two layers, then close the packet around the new crease.'});
  actions.push({kind:'template',template:'reverse',pivot:[cx,rootY],spine:[cx,rootY+q],hinge:[cx+q,rootY+q*.5],frontSectors:[0,1,2,7],backSectors:[3,4,5,6],duration:6,title:'Inside-reverse fold the tail',caption:'Repeat with the right narrow point. The two long points now rise on either side of the wings.'});
  const neckLength=cy+q-rootY,neck=[-2*.42/(1+.42*.42),( .42*.42-1)/(1+.42*.42)];
  const H=[cx+neck[0]*neckLength*.78,rootY+neck[1]*neckLength*.78],tip=[cx+neck[0]*neckLength,rootY+neck[1]*neckLength];
  const hx=neck[0]-.9,hy=neck[1]+Math.sqrt(1-.9*.9),hinge=[[H[0]-hx*q,H[1]-hy*q],[H[0]+hx*q,H[1]+hy*q]];
  const side=Math.sign((hinge[1][0]-hinge[0][0])*(tip[1]-hinge[0][1])-(hinge[1][1]-hinge[0][1])*(tip[0]-hinge[0][0]));
  fold(hinge,side,180*side,'V','Fold a small beak','Fold the last fifth of the neck tip down and outward. This lesson uses a simple tip fold for the head.',{scopeSectors:[2,3],seed:[x+w*.001,y+h*.999]});
  // Lower the wing roots slightly toward the open end of the bird base.
  const wingY=cy-q*.83;
  fold([[cx-q,wingY],[cx+q,wingY]],-1,-90,'V','Lower the first wing','Hold the body and lower the broad front flap. Leave the neck and tail in place.',{scopeSectors:[0,1,2,7],seed:[x+w*.99,y+h*.99],duration:4});
  fold([[cx-q,wingY],[cx+q,wingY]],-1,90,'M','Open the other wing','Lower the opposite broad flap to the other side. The wings now spread away from the body.',{scopeSectors:[3,4,5,6],seed:[x+w*.01,y+h*.01],duration:4});
  actions.push({kind:'template',template:'turn',axis:[[cx-q,wingY,0],[cx+q,wingY,0]],angle:-90,duration:3,title:'Your paper crane',caption:'The completed crane has two spread wings, a raised tail and a small folded beak. Rotate the view to inspect both sides. This is a zero-thickness paper model; gentle body inflation is optional hand shaping.'});
  return actions;
}
