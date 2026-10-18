import fs from 'node:fs';
import vm from 'node:vm';
for(const file of ['studio-v2.html','fold-lab-v2.html']){
 const html=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');let count=0;
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(/\bsrc\s*=|type\s*=\s*["'](?:module|x-shader)/i.test(match[1])||!match[2].trim())continue;
  new vm.Script(match[2],{filename:file+':script'+(++count)});
 }
 if((html.match(/src="assets\/storyboard.js"/g)||[]).length!==1)throw Error('Expected one V2 UI module in '+file);
 console.log(file+': '+count+' inline application scripts parse; one V2 module.');
}
