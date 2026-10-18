import {rectanglePaper} from './example-lessons.js';
// Practice models are authored through the same public actions as the editor.
export function pocketLesson(size=400,depth=.25){
  const paper=rectanglePaper(size,size),c=size/2;
  return {format:'fold-lab-tutorial',version:2,title:'Pocket folds — squash & open sink',paper,fold:paper,actions:[
    {kind:'fold',axis:[[0,0],[size,size]],side:1,angle:180,title:'Prepare the first diagonal',caption:'Bring opposite corners together.',duration:2},
    {kind:'unfold',foldIndex:0,title:'Open the diagonal',duration:2},
    {kind:'fold',axis:[[size,0],[0,size]],side:1,angle:180,title:'Prepare the other diagonal',caption:'Mark the matching guide on the other diagonal.',duration:2},
    {kind:'unfold',foldIndex:2,title:'Open to a square',duration:2},
    {kind:'fold',axis:[[0,c],[size,c]],side:-1,angle:180,title:'Fold the square in half',caption:'Bring the upper edge down to the lower edge. Leave both side pockets free.',duration:3},
    {kind:'template',template:'squash',title:'Squash the two pockets',caption:'Open both symmetric pockets and flatten them into a triangular waterbomb base.',duration:7},
    {kind:'template',template:'openSink',depth,title:'Open-sink the closed point',caption:'Open the base to expose the square rim. Push the central cap inside, then close around it.',duration:8,pauseAfter:true}
  ]};
}
export function reversePractice(size=320,width=.6){
  // A triangular sheet is useful for testing the same reverse action without
  // square-base sector IDs. Both walls remain connected along the spine.
  const paper={vertices_coords:[[0,0],[-size*width,size],[size*width,size]],faces_vertices:[[0,1,2]],edges_vertices:[[0,1],[1,2],[2,0]],edges_assignment:['B','B','B']};
  return {format:'fold-lab-tutorial',version:2,title:'Turn a point inward',paper,fold:paper,actions:[
    {kind:'fold',axis:[[0,0],[0,size]],side:1,angle:180,title:'Make a two-wall point',caption:'Bring the left edge onto the right edge.',duration:3},
    {kind:'template',template:'reverse',pivot:[0,size*.65],spine:[0,0],hinge:[size*width*.45,size*.48],frontRegions:[[[0,0],[-size*width,size],[0,size]]],backRegions:[[[0,0],[0,size],[size*width,size]]],title:'Turn the tip inward',caption:'Open the joined walls, turn the pointed end inside and close the packet.',duration:7}
  ]};
}
