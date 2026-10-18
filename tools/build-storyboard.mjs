// Build standalone V2 entry points from the maintained application sources.
// Public legacy URLs redirect to V2; maintained sources live under tools/.
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
for(const [source,out,page,title] of [
 ['tools/designer.template.html','studio-v2.html','design','Origami Studio V2 | Design'],
 ['tools/origami3d.generated.html','fold-lab-v2.html','fold','Origami Studio V2 | Fold & Teach']
]){
 let html=fs.readFileSync(new URL(source,root),'utf8');
 html=html.replace('<html lang="en">',`<html lang="en" data-ui="storyboard" data-page="${page}">`)
  .replace(/<title>[^<]*<\/title>/,`<title>${title}</title>`)
  .replace('</head>',`<style id="storyBootStyle">html[data-ui=storyboard] body:not(.story-ready)>:not(#storyBootHeader):not(script):not(style){visibility:hidden!important}html[data-ui=storyboard] body{background:#fbfbfa}#storyBootHeader .story-nav>*{font-weight:400!important}</style><link rel="stylesheet" href="assets/storyboard.css">\n</head>`);
 const boot=`<div id="storyBootHeader" class="story-header" role="banner"><a class="story-brand" href="studio-v2.html" aria-label="Origami Studio — Design"><strong>origami</strong><span>studio</span></a><nav class="story-nav" aria-label="Workspace"><a href="studio-v2.html" data-mode="design"${page==='design'?' aria-current="page"':''}>Design</a><a href="fold-lab-v2.html">Fold Lab</a><a href="fold-lab-v2.html?view=tutorials">Tutorials</a><a href="fold-lab-v2.html?view=create">Make tutorial</a></nav></div>`;
 html=html.replace(/<body\b[^>]*>/,match=>match+boot);
 // The Designer contains a print-document HTML string with its own </body>.
 // Inject at the real document end, never inside that JavaScript string.
 const end=html.lastIndexOf('</body>');
 if(end<0)throw Error('Missing body end in '+source);
 html=html.slice(0,end)+'<script type="module" src="assets/storyboard.js"></script>\n'+html.slice(end);
 fs.writeFileSync(new URL(out,root),html);console.log('Built '+out);
}

// Preserve incoming bookmarks, query parameters and anchors without exposing the old UI.
for(const [old,target] of [['cp-designer.html','studio-v2.html'],['cp-designer_with constraints.html','studio-v2.html'],['origami-3d.html','fold-lab-v2.html']]){
 fs.writeFileSync(new URL(old,root),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Origami Studio</title><script>location.replace('+JSON.stringify(target)+'+location.search+location.hash);</script><body><a href="'+target+'">Open Origami Studio</a></body></html>');
}
