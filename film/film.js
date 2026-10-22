/* Every visible pose is a pure function of the Motion frame clock. */
const data = window.CRATE_DATA, audio = window.CRATE_TIMING;
const duration = Math.ceil(audio.duration * 30) / 30;
const cues = Object.fromEntries(audio.lines.map(line => [line.id, line]));
const at = id => cues[id].start, frame = time => Math.round(time * 30);
const M = Motion.film({fps:30,duration,width:1920,height:1080,clock:'smooth'});
const books = Object.fromEntries(data.books.map(book => [book.id,book]));
const proofIn=at('evidence'), proofOut=at('pack'), ending=at('credit')-.05;

function textLines(ctx,text,width,font,x,y,leading){
  ctx.font=font; let current='';
  for(const word of text.split(' ')){
    const next=current?current+' '+word:word;
    if(ctx.measureText(next).width>width&&current){ctx.fillText(current,x,y);y+=leading;current=word;}else current=next;
  }
  if(current)ctx.fillText(current,x,y);
}
function bookTexture(THREE,book){
  const c=document.createElement('canvas');c.width=768;c.height=1080;const ctx=c.getContext('2d');
  ctx.fillStyle=book.color;ctx.fillRect(0,0,768,1080);
  ctx.fillStyle='#ffffff0b';for(let x=0;x<768;x+=5)ctx.fillRect(x,0,1,1080);
  ctx.fillStyle='#142c2514';for(let y=0;y<1080;y+=7)ctx.fillRect(0,y,768,1);
  const shade=ctx.createLinearGradient(0,0,80,0);shade.addColorStop(0,'#122a2538');shade.addColorStop(.5,'#122a2510');shade.addColorStop(1,'#ffffff00');
  ctx.fillStyle=shade;ctx.fillRect(0,0,80,1080);ctx.fillStyle='#10261f';
  textLines(ctx,book.author,620,'36px "Segoe UI"',64,122,48);
  textLines(ctx,book.title,630,'88px Georgia',64,305,102);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;return map;
}
const A=[-3.55,-1.1,0],B=[3.55,-1.1,-.3];
const slots=[[-.96,1.23],[.96,1.23],[-.96,-1.35],[.96,-1.35]];
const slot=(event,index)=>{const base=event==='a'?A:B;return[base[0]+slots[index][0],-.72,base[2]+slots[index][1]];};
const placements=data.original.assignments.a.map((id,i)=>({key:`a${i}`,id,event:'a',index:i}))
  .concat(data.original.assignments.b.map((id,i)=>({key:`b${i}`,id,event:'b',index:i})));

M.hero3d('#physical-world',{
  module:new URL('./runtime/hero3d/hero3d.js',document.baseURI).href,
  envMap:'room',toneMapping:'neutral',ground:{y:-1.37,opacity:.3},key:{position:[-6,12,8],intensity:2.7},rim:{position:[9,7,-7],intensity:1.2},
  camera:{fov:34,position:[1.3,2.7,9],target:[0,.1,1]},
  build:async THREE=>{
    await document.fonts.ready;const result={};
    const cloth=color=>new THREE.MeshStandardMaterial({color,roughness:.86,metalness:0});
    const wood=cloth('#c5ae8b'),pale=cloth('#ede9dc'),green=cloth('#285544'),edge=cloth('#c4c3b6');
    const grain=document.createElement('canvas');grain.width=1024;grain.height=128;const grainInk=grain.getContext('2d');
    grainInk.fillStyle='#c5ae8b';grainInk.fillRect(0,0,1024,128);grainInk.strokeStyle='#80674430';grainInk.lineWidth=1;
    for(let row=0;row<128;row+=4){grainInk.beginPath();for(let x=0;x<=1024;x+=8){const y=row+Math.sin(x*.01+row*.14)*1.7;if(x===0)grainInk.moveTo(x,y);else grainInk.lineTo(x,y);}grainInk.stroke();}
    wood.map=new THREE.CanvasTexture(grain);wood.map.colorSpace=THREE.SRGBColorSpace;
    function box(w,h,d,mat,x=0,y=0,z=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;}
    const desk=new THREE.Mesh(new THREE.PlaneGeometry(70,70),cloth('#e6e9df'));desk.rotation.x=-Math.PI/2;desk.position.y=-1.38;desk.receiveShadow=true;result.desk=desk;
    function label(text){
      const c=document.createElement('canvas');c.width=1024;c.height=160;const ctx=c.getContext('2d');
      ctx.fillStyle='#e5dbc2';ctx.fillRect(0,0,1024,160);ctx.fillStyle='#263f32';ctx.font='60px Georgia';ctx.textAlign='center';ctx.fillText(text,512,104);
      const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map});
    }
    for(const [id,base,title]of[['crateA',A,'Future Frequencies'],['crateB',B,'Soul & City']]){
      const group=new THREE.Group();group.add(box(4.75,.16,5.4,pale,0,-.11,0));
      for(const z of[-2.74,2.74]){group.add(box(4.95,.34,.12,wood,0,.08,z));group.add(box(4.95,.34,.12,wood,0,.56,z));}
      for(const x of[-2.44,2.44])group.add(box(.12,.95,5.6,wood,x,.36,0));
      for(const x of[-2.25,2.25])for(const z of[-2.62,2.62])group.add(box(.18,1.03,.18,wood,x,.32,z));
      const tag=new THREE.Mesh(new THREE.PlaneGeometry(3.65,.57),label(title));tag.position.set(0,.5,2.813);group.add(tag);
      group.position.set(...base);result[id]=group;
    }
    function makeBook(book){
      const group=new THREE.Group(),cover=cloth(book.color);
      group.add(box(1.75,2.48,.035,cover,0,0,-.15));group.add(box(1.63,2.38,.24,pale,.018,0,0));group.add(box(.095,2.48,.33,cover,-.84,0,0));
      const face=new THREE.Mesh(new THREE.BoxGeometry(1.75,2.48,.035),[cover,cover,cover,cover,new THREE.MeshBasicMaterial({map:bookTexture(THREE,book)}),cover]);
      face.position.z=.15;group.add(face);
      for(let y=-1.1;y<1.1;y+=.056)group.add(box(.003,.003,.23,edge,.835,y,0));return group;
    }
    for(const p of placements)result[p.key]=makeBook(books[p.id]);result.replacement=makeBook(books.b1);
    const band=new THREE.Group();band.add(box(.42,.06,5.75,green));band.add(box(5.05,.06,.42,green,0,.01,0));band.position.set(B[0],-.25,B[2]);result.band=band;
    return result;
  },
  state:(t,objects,{key})=>{
    const pack=at('pack'),out=at('stockout'),lock=at('lock'),repair=at('repair');
    const cameraPosition=key(t,[[0,[1.3,2.7,9]],[at('scarce'),[0,4.6,12.6],'glide'],[proofIn-.15,[.4,3.7,9.4],'gentleIn'],[proofOut,[0,9.5,13.1]],
      [pack+1.25,[0,9.1,12.8],'glide'],[out-.15,[-.3,9.3,12.6]],[out+1.3,[-3.6,6.6,8.8],'glide'],[lock-.15,[2.3,7.2,9.4],'glide'],
      [lock+1.3,[3.5,6.4,8.3],'glide'],[repair-.12,[-3.5,7.1,9.5],'softInOut'],[repair+2.1,[-2.8,6.4,8.8],'glide'],
      [at('promise'),[-.2,9.7,13.4],'softInOut'],[ending,[0,10,13.8],'glide'],[duration,[0,10.2,14.1]]]);
    const target=key(t,[[0,[0,.05,1]],[at('scarce'),[0,-.25,.5]],[pack,[0,-1,0]],[out-.1,[0,-1,0]],[out+1.3,[-3.3,-.35,.75]],
      [lock-.15,[2.7,-.75,0]],[lock+1.3,[3.5,-.8,0]],[repair-.1,[-3.5,-.4,1]],[at('promise'),[0,-.8,0]]]);
    const states={};
    for(const p of placements){
      const dest=slot(p.event,p.index),onset=pack+.1+placements.indexOf(p)*.24,special=p.key==='a1';
      let position=key(t,[[0,[special?0:(p.event==='a'?-10:10),special?.2:4,special?1.7:0]],
        [at('scarce'),[special?-.6:(p.event==='a'?-10:10),special?.45:4,special?1.4:0]],
        [proofIn-.6,[special?.55:(p.event==='a'?-10:10),special?.6:4,special?1.5:0]],
        [onset,[special?0:(p.event==='a'?-8:8),3.5,3]],[onset+.7,dest,'softLand']]);
      let rotation=key(t,[[0,[-.08,-.32,-.08]],[at('scarce'),[-.06,.24,.035],'glide'],[onset,[-.3,p.event==='a'?.28:-.28,-.12]],[onset+.7,[-Math.PI/2,0,0],'softLand']]);
      const scale=special?key(t,[[0,[1.7,1.7,1.7]],[at('scarce'),[1.5,1.5,1.5]],[onset,[1.5,1.5,1.5]],[onset+.7,[1,1,1],'softLand']]):[1,1,1];
      if(special&&t>=out){position=key(t,[[out,dest],[out+.55,[dest[0],1.15,dest[2]+.45],'softLand'],[out+1.15,[-9,3.2,2],'accelExit']]);
        rotation=key(t,[[out,[-Math.PI/2,0,0]],[out+.55,[-.2,-.2,-.1],'glide'],[out+1.15,[.3,-.8,-.35],'accelExit']]);}
      states[p.key]={position,rotation,scale,visible:special?t<out+1.15:t>=onset-.05};
    }
    states.replacement={position:key(t,[[0,[-8,3,2]],[repair-.15,[-8,3,2]],[repair+.55,[-3.2,1.2,2.3],'softLand'],[repair+1.35,slot('a',1),'softLand']]),
      rotation:key(t,[[0,[-.12,.4,.1]],[repair+.55,[-.12,.25,.06]],[repair+1.35,[-Math.PI/2,0,0],'softLand']]),visible:t>=repair-.15};
    states.band={position:[B[0],key(t,[[0,3],[lock,3],[lock+.45,-.28,'softLand']]),B[2]],visible:t>=lock};
    return{camera:{position:cameraPosition,target,fov:34},objects:states,keyIntensity:2.7,keyPosition:[-6+.025*t,12,8]};
  }
});

M.show('#programme-proof',frame(proofIn-.9),frame(proofIn+1.2));
M.camera('#programme-photo',[[frame(proofIn-.9),{scale:5.2,x:960-5.2*718,y:540-5.2*505}],[frame(proofIn+1.2),{scale:5.2,x:960-5.2*725,y:540-5.2*512}]],{origin:'0% 0%'});
M.show('#evidence-proof',frame(proofIn+1.2),frame(proofOut));
M.camera('#evidence-photo',[[frame(proofIn+1.2),{scale:4.25,x:960-4.25*860,y:470-4.25*218}],
  [frame(proofIn+1.8),{scale:4.25,x:960-4.25*900,y:470-4.25*218},'glide'],
  [frame(proofIn+2.5),{scale:4.25,x:960-4.25*805,y:440-4.25*530},'softInOut'],
  [frame(proofIn+3.7),{scale:4.25,x:960-4.25*805,y:440-4.25*570}],
  [frame(proofIn+4.2),{scale:4.25,x:960-4.25*1083,y:440-4.25*530},'softInOut'],
  [frame(proofOut),{scale:4.25,x:960-4.25*1083,y:440-4.25*570}]],{origin:'0% 0%'});

M.show('#opening-words',0,frame(at('scarce')-.1));M.words('#opening-words',{at:2,mech:'rise',dist:42,gaps:[5,5,8],frames:12});
M.kf('#opening-words','y',[[0,0],[frame(at('scarce')-.1),-25]]);
M.show('#one-copy',frame(at('scarce')+.1),frame(proofIn-.2));M.words('#one-copy',{at:frame(at('scarce')+.1),mech:'rise',dist:35,gaps:5});
M.show('#stock-out',frame(at('stockout')+.12),frame(at('lock')-.12));M.words('#stock-out',{at:frame(at('stockout')+.12),mech:'slide',dist:60,gaps:4});
M.show('#protected',frame(at('lock')+.38),frame(at('repair')-.18));M.enter('#protected',{at:frame(at('lock')+.38),frames:12,from:{y:32,scale:1.12}});
M.show('#replacement-name',frame(at('repair')+.65),frame(at('promise')-.1));M.enter('#replacement-name',{at:frame(at('repair')+.65),frames:14,from:{y:35}});
M.show('#promise-words',frame(at('promise')),frame(ending));M.words('#promise-words',{at:frame(at('promise')),mech:'rise',gaps:[6,6,9,6,6],dist:45,frames:13});
M.show('#closing',frame(ending),frame(duration)+1);
// The packing label travels into its final pose through the spoken credit.
// It settles only after the name, rather than holding a near-static slow zoom.
M.camera('#closing-inner',[[frame(ending),{x:-220,y:100,scale:1.32}],
  [frame(duration-.6),{x:40,y:-30,scale:1}]],{origin:'50% 50%'});
for(const[t,label]of[[proofIn-.9,'actual programme interests'],[proofIn+1.2,'live evidence macro'],[proofOut,'returned order to physical packing'],[ending,'Crate close']])M.mark(frame(t),'cut',label);
window.__ready=Motion.loaded().then(()=>{
  const seek=Motion.selfTest(M,{samples:18});
  if(!seek.ok)throw new Error('Frame-clock self-test found a seek mismatch.');
  window.__filmReady={duration,placements:placements.length,stockout:'b3',replacement:'b1',mode:data.snapshot.mode,seek};
});
