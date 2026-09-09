const canvas=document.getElementById("screen"),ctx=canvas.getContext("2d");
const W=640,H=360,keys={},pressed={};
let state="title",last=0,shake=0,screenConfirm=false,notice="",nearText="";
let map="vale",dialogue=[],dialogueIndex=0,battle=null;
let soulFound=false,courage=0,pacifist=0;
let defeated={bat:false,sentinel:false,duelist:false,boss:false};
try{
 const d=JSON.parse(localStorage.getItem("soulbound-v4-save")||"{}");
 map=d.map||"vale"; soulFound=!!d.soul; courage=d.courage||0; pacifist=d.pacifist||0;
 defeated=Object.assign(defeated,d.defeated||{});
}catch(e){}
const player={x:320,y:285,r:7,s:2.7,hp:20,maxHp:20};
try{player.hp=Math.max(1,Math.min(20,JSON.parse(localStorage.getItem("soulbound-v4-save")||"{}").hp||20))}catch(e){}

addEventListener("keydown",e=>{
 const k=e.key.toLowerCase(); if(!keys[k])pressed[k]=true; keys[k]=true;
 if([" ","arrowup","arrowdown","arrowleft","arrowright"].includes(k))e.preventDefault();
});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
canvas.addEventListener("pointerdown",()=>screenConfirm=true);
document.querySelectorAll("#mobile-controls button").forEach(b=>{
 const k=b.dataset.key;
 const down=e=>{e.preventDefault();if(!keys[k])pressed[k]=true;keys[k]=true};
 const up=e=>{e.preventDefault();keys[k]=false};
 b.addEventListener("pointerdown",down);b.addEventListener("pointerup",up);
 b.addEventListener("pointercancel",up);b.addEventListener("pointerleave",up);
});
const fs=document.getElementById("fullscreen");
async function toggleFullscreen(){
 try{
  if(!document.fullscreenElement) await document.documentElement.requestFullscreen();
  else await document.exitFullscreen();
 }catch(e){}
}
fs.addEventListener("click",toggleFullscreen);
addEventListener("keydown",e=>{if(e.key.toLowerCase()==="f")toggleFullscreen()});

const maps={
 vale:{name:"Vale das Cinzas",bg:"#11192a",ground:"#20324a"},
 forest:{name:"Floresta Sussurrante",bg:"#09170f",ground:"#173a28"},
 cave:{name:"Caverna do Eco",bg:"#17111e",ground:"#30233d"},
 ruins:{name:"Ruínas do Eclipse",bg:"#171718",ground:"#353337"}
};
const npcs={
 vale:[
  {x:125,y:118,name:"Mira",kind:"mira",lines:["Mira: Você encontrou a alma perdida.","Mira: O caminho ao norte esconde três desafios.","Mira: Não confunda coragem com força."]},
  {x:500,y:118,name:"Téo",kind:"teo",lines:["Téo: A floresta tem olhos por toda parte.","Téo: Alguns monstros atacam por medo.","Téo: Tente conversar antes de lutar."]}
 ],
 forest:[
  {x:150,y:125,name:"Lume",kind:"lume",lines:["Lume: A floresta muda quando você muda.","Lume: Há um duelo perto das árvores antigas.","Lume: Escute o inimigo antes do último golpe."]},
  {x:490,y:255,name:"Nara",kind:"nara",lines:["Nara: A caverna começa depois da ponte.","Nara: A Sentinela não gosta de visitantes.","Nara: Mas ela respeita quem permanece de pé."]}
 ],
 cave:[
  {x:145,y:245,name:"Orin",kind:"orin",lines:["Orin: O Guardião do Eclipse está adiante.","Orin: Ele não é o único que vigia estas pedras.","Orin: Você decide como essa história termina."]},
  {x:505,y:100,name:"Eco",kind:"eco",lines:["Eco: Cada golpe deixa uma marca.","Eco: Até a vitória tem consequências."]}
 ],
 ruins:[
  {x:320,y:105,name:"A Voz",kind:"eco",lines:["A Voz: Você chegou ao último salão.","A Voz: Há mais de uma maneira de vencer.","A Voz: Escolha o destino da sua alma."]}
 ]
};
const enemies={
 bat:{name:"Morcego Nebuloso",hp:18,maxHp:18,pattern:"zigzag",kind:"bat"},
 sentinel:{name:"Sentinela de Pedra",hp:25,maxHp:25,pattern:"walls",kind:"sentinel"},
 duelist:{name:"Duelista Rubro",hp:32,maxHp:32,pattern:"slash",kind:"duelist"},
 boss:{name:"Guardião do Eclipse",hp:52,maxHp:52,pattern:"boss",kind:"boss"}
};

function save(){localStorage.setItem("soulbound-v4-save",JSON.stringify({hp:player.hp,map,soul:soulFound,courage,pacifist,defeated}))}
function reset(){localStorage.removeItem("soulbound-v4-save");location.reload()}
function txt(t,x,y,size=13,a="left"){ctx.font=`${size}px monospace`;ctx.textAlign=a;ctx.fillStyle="#fff";ctx.fillText(t,x,y)}
function start(){state="world";notice="Explore. E para falar, examinar e entrar em passagens.";save()}
function say(lines){dialogue=[...lines];dialogueIndex=0;state="dialogue"}
function move(dx,dy,dt){
 if(dx&&dy){dx*=.70710678;dy*=.70710678}
 player.x=Math.max(22,Math.min(618,player.x+dx*player.s*dt*60));
 player.y=Math.max(58,Math.min(338,player.y+dy*player.s*dt*60));
}
function interact(){
 let best=null,bd=999;
 for(const n of (npcs[map]||[])){const d=Math.hypot(player.x-n.x,player.y-n.y);if(d<bd){bd=d;best=n}}
 if(best&&bd<55){say(best.lines);return}
 if(map==="vale"&&!soulFound&&Math.hypot(player.x-535,player.y-245)<42){
  soulFound=true;player.hp=20;say(["Você encontrou sua alma.","O coração agora está completo.","HP restaurado."]);save();return
 }
 if(map==="vale"&&soulFound&&player.y<70){map="forest";player.x=320;player.y=320;notice="Floresta Sussurrante";save();return}
 if(map==="forest"&&player.y<68){map="cave";player.x=320;player.y=320;notice="Caverna do Eco";save();return}
 if(map==="cave"&&player.y<68){map="ruins";player.x=320;player.y=320;notice="Ruínas do Eclipse";save();return}
 if(map==="forest"&&Math.hypot(player.x-320,player.y-92)<34&&!defeated.duelist){startBattle("duelist");return}
 if(map==="cave"&&Math.hypot(player.x-320,player.y-185)<34&&!defeated.sentinel){startBattle("sentinel");return}
 if(map==="ruins"&&!defeated.boss&&player.y<145){startBattle("boss");return}
}
function autoEncounter(){
 if(map==="forest"&&!defeated.bat&&player.x>290&&player.x<350&&player.y>165&&player.y<205)startBattle("bat");
}
function startBattle(type){
 const e=enemies[type];
 battle={type,enemy:e.name,hp:e.hp,maxHp:e.maxHp,pattern:e.pattern,kind:e.kind,boss:type==="boss",
 phase:"menu",choice:0,turn:0,timer:0,shots:[],effects:[],heart:{x:320,y:255,r:7},
 hitFlash:0,enemyShake:0,defeat:0,result:null};
 state="battle";notice="";
}
function finish(result){defeated[battle.type]=true;battle.result=result;battle.phase="defeat";battle.defeat=0;save()}
function update(dt){
 if(state==="title"){if(pressed.enter||pressed[" "])start();if(pressed.r)reset();return}
 if(state==="dialogue"){
  if(pressed.e||pressed[" "]||pressed.enter){dialogueIndex++;if(dialogueIndex>=dialogue.length){state="world";save()}}
  return
 }
 if(state==="world"){
  const dx=(keys.arrowright||keys.d?1:0)-(keys.arrowleft||keys.a?1:0);
  const dy=(keys.arrowdown||keys.s?1:0)-(keys.arrowup||keys.w?1:0);
  move(dx,dy,dt);
  nearText="";
  for(const n of (npcs[map]||[]))if(Math.hypot(player.x-n.x,player.y-n.y)<55)nearText=`E • ${n.name}`;
  if(pressed.e||pressed[" "])interact();
  autoEncounter();return
 }
 if(state==="battle")updateBattle(dt)
}
function updateBattle(dt){
 if(battle.phase==="menu"){
  if(pressed.arrowleft||pressed.a)battle.choice=(battle.choice+3)%4;
  if(pressed.arrowright||pressed.d)battle.choice=(battle.choice+1)%4;
  if(pressed.e||pressed[" "]||pressed.enter){
   const c=["LUTAR","AGIR","ITEM","POUPAR"][battle.choice];
   if(c==="LUTAR"){
    const dmg=6+Math.floor(Math.random()*6);battle.hp=Math.max(0,battle.hp-dmg);courage++;
    battle.enemyShake=12;battle.hitFlash=.15;
    battle.effects.push({type:"hit",x:405,y:112,life:.35,text:`-${dmg}`});
    if(battle.hp<=0){finish("win");return}
    battle.phase="enemy";battle.timer=0;battle.shots=[]
   }else if(c==="AGIR"){pacifist++;notice=battle.boss?"Você encarou o Guardião.":"Você observou os movimentos do inimigo.";battle.phase="enemy";battle.timer=0;battle.shots=[]}
   else if(c==="ITEM"){player.hp=Math.min(20,player.hp+8);notice="Você usou uma essência. HP +8.";battle.phase="enemy";battle.timer=0;battle.shots=[]}
   else {if(battle.turn>=1||pacifist>=2){finish("spared");return}notice="Ainda não é possível poupá-lo.";battle.phase="enemy";battle.timer=0;battle.shots=[]}
  }return
 }
 if(battle.phase==="enemy"){
  battle.timer+=dt;battle.enemyShake=Math.max(0,battle.enemyShake-dt*25);battle.hitFlash=Math.max(0,battle.hitFlash-dt);
  spawn(dt);
  for(const s of battle.shots){s.x+=s.vx*dt*60;s.y+=s.vy*dt*60;s.t=(s.t||0)+dt}
  battle.shots=battle.shots.filter(s=>s.x>-40&&s.x<680&&s.y>145&&s.y<325);
  let hx=(keys.arrowright||keys.d?1:0)-(keys.arrowleft||keys.a?1:0);
  let hy=(keys.arrowdown||keys.s?1:0)-(keys.arrowup||keys.w?1:0);
  if(hx&&hy){hx*=.7071;hy*=.7071}
  const speed=battle.boss?235:225,h=battle.heart;
  h.x+=hx*speed*dt;h.y+=hy*speed*dt;
  h.x=Math.max(84+h.r,Math.min(556-h.r,h.x));h.y=Math.max(163+h.r,Math.min(312-h.r,h.y));
  for(const s of battle.shots)if(!s.hit&&Math.hypot(s.x-h.x,s.y-h.y)<s.r+h.r){s.hit=true;player.hp--;shake=7}
  if(player.hp<=0){battle.phase="lose";return}
  if(battle.timer>4.4){battle.turn++;battle.phase="menu";battle.shots=[];notice="Seu turno.";save()}
  return
 }
 if(battle.phase==="defeat"){
  battle.defeat+=dt;
  if(battle.defeat>2.5&&(pressed.e||pressed[" "]||pressed.enter||screenConfirm)){
   screenConfirm=false;player.hp=Math.min(20,player.hp+3);
   if(battle.boss){map="ruins";player.x=320;player.y=300;notice="O salão ficou em silêncio."}
   else {player.x=320;player.y=300;notice="O inimigo não voltará."}
   battle=null;state="world";save()
  }return
 }
 if(battle.phase==="lose"&&(pressed.e||pressed[" "]||pressed.enter||screenConfirm)){
  screenConfirm=false;player.hp=10;battle=null;state="world";player.x=320;player.y=300;notice="Você voltou com 10 HP.";save()
 }
}
function spawn(dt){
 const t=battle.timer,p=battle.pattern;
 if(p==="zigzag"&&Math.floor(t*5)!==Math.floor((t-dt)*5))battle.shots.push({x:90+Math.random()*460,y:160,r:5,vx:(Math.random()-.5)*2,vy:1.8,kind:"orb"});
 if(p==="walls"&&Math.floor(t*3)!==Math.floor((t-dt)*3)){const side=Math.random()<.5;battle.shots.push(side?{x:82,y:170+Math.random()*135,r:7,vx:2.7,vy:0,kind:"punch"}:{x:558,y:170+Math.random()*135,r:7,vx:-2.7,vy:0,kind:"punch"})}
 if(p==="slash"&&Math.floor(t*2.5)!==Math.floor((t-dt)*2.5)){
  const y=185+Math.random()*105;battle.shots.push({x:85,y,r:4,vx:4.8,vy:0,kind:"slash",life:0});
  battle.shots.push({x:555,y:y+25,r:4,vx:-4.8,vy:0,kind:"slash",life:0})
 }
 if(p==="boss"){
  if(Math.floor(t*5)!==Math.floor((t-dt)*5))battle.shots.push({x:90+Math.random()*460,y:158,r:5,vx:(Math.random()-.5)*1.2,vy:2.8+Math.random()*1.2,kind:"blade"});
  if(Math.floor(t*2)!==Math.floor((t-dt)*2))battle.shots.push({x:82,y:235+Math.sin(t*4)*60,r:7,vx:3.3,vy:0,kind:"punch"});
 }
}
function draw(){
 ctx.save();if(shake){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.88;if(shake<.2)shake=0}
 ctx.clearRect(0,0,W,H);
 if(state==="title")title();else if(state==="world"||state==="dialogue"){world();if(state==="dialogue")dialog()}
 else battleDraw();ctx.restore();
 for(const k in pressed)delete pressed[k];requestAnimationFrame(loop)
}
function title(){
 ctx.fillStyle="#07070c";ctx.fillRect(0,0,W,H);txt("SOULBOUND",320,92,52,"center");txt("V4 — A Jornada da Alma",320,126,15,"center");
 ctx.strokeStyle="#fff";ctx.strokeRect(245,170,150,52);txt("COMEÇAR",320,203,17,"center");txt("WASD / SETAS • E / ESPAÇO",320,253,12,"center");txt("F ou ⛶ = tela cheia",320,277,11,"center");txt("R = novo jogo",320,298,11,"center")
}
function world(){
 const m=maps[map];ctx.fillStyle=m.bg;ctx.fillRect(0,0,W,H);ctx.fillStyle=m.ground;ctx.fillRect(0,55,W,305);
 drawNature();drawHouses();drawTrees();
 ctx.fillStyle="#08090dcc";ctx.fillRect(10,10,620,34);txt(`${m.name} • HP ${player.hp}/${player.maxHp}`,20,32,12);
 if(map==="vale"&&!soulFound)drawHeart(535,245,1.3);
 for(const n of (npcs[map]||[]))drawNPC(n);
 if(map==="forest"&&!defeated.duelist)drawDuelist(320,92);
 if(map==="cave"&&!defeated.sentinel)drawSentinel(320,185);
 if(map==="ruins"&&!defeated.boss)drawBoss(320,105);
 drawHeart(player.x,player.y,.75);
 if(nearText){ctx.fillStyle="#000d";ctx.fillRect(player.x-55,player.y-44,110,18);txt(nearText,player.x,player.y-31,9,"center")}
 ctx.fillStyle="#000d";ctx.fillRect(12,311,616,37);ctx.strokeStyle="#fff";ctx.strokeRect(12,311,616,37);txt(notice||"Explore • E para interagir",25,334,10)
}
function drawNature(){
 for(let i=0;i<45;i++){const x=(i*137+23)%620,y=72+(i*61)%270;ctx.fillStyle=map==="cave"||map==="ruins"?"#55425d":map==="forest"?"#2d6743":"#466447";ctx.fillRect(x,y,3,8);ctx.fillRect(x-3,y+5,9,3)}
}
function drawTrees(){
 const count=map==="cave"?5:map==="ruins"?7:13;
 for(let i=0;i<count;i++){let x=(i*97+45)%620,y=72+(i*53)%250;
  ctx.fillStyle=map==="forest"?"#143d25":"#263f2a";ctx.fillRect(x-4,y+13,8,20);
  ctx.fillStyle=map==="forest"?"#28613a":"#38583b";ctx.fillRect(x-16,y-2,32,24);ctx.fillRect(x-10,y-10,20,12)
 }
}
function drawHouses(){
 if(map==="cave")return;
 const places=map==="vale"?[[65,75],[420,70]]:map==="forest"?[[55,72],[525,70]]:[[80,70],[455,70]];
 for(const [x,y] of places){
  ctx.fillStyle="#6d5140";ctx.fillRect(x,y+15,70,52);ctx.fillStyle="#873e46";ctx.beginPath();ctx.moveTo(x-7,y+17);ctx.lineTo(x+35,y-13);ctx.lineTo(x+77,y+17);ctx.closePath();ctx.fill();
  ctx.fillStyle="#221a1a";ctx.fillRect(x+28,y+39,15,28);ctx.fillStyle="#c7a75d";ctx.fillRect(x+9,y+30,14,13);ctx.fillRect(x+50,y+30,14,13)
 }
}
function drawHeart(x,y,s){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle="#ff4059";
 ctx.beginPath();ctx.moveTo(0,9);ctx.lineTo(-12,-3);ctx.quadraticCurveTo(-17,-12,-9,-16);ctx.quadraticCurveTo(-3,-19,0,-11);ctx.quadraticCurveTo(3,-19,9,-16);ctx.quadraticCurveTo(17,-12,12,-3);ctx.closePath();ctx.fill();
 ctx.restore()
}
function drawNPC(n){
 const pal={mira:["#8a4f65","#f1c1a4","#d9b7df"],teo:["#3d6d8e","#d6a67d","#cde7f4"],lume:["#397d55","#dfb08b","#b9f5c8"],nara:["#76569a","#e2b49e","#e5c8ff"],orin:["#705b49","#c99878","#ead7b8"],eco:["#4c4982","#c3b0a7","#d4d0ff"]}[n.kind]||["#6b5060","#d9ad91","#eee"];
 const [coat,skin,hat]=pal;ctx.save();ctx.translate(n.x,n.y);
 // 8-bit silhouette
 ctx.fillStyle=coat;ctx.fillRect(-12,-3,24,25);ctx.fillRect(-15,2,30,13);
 ctx.fillStyle=skin;ctx.fillRect(-8,-25,16,19);ctx.fillRect(-11,-20,22,9);
 ctx.fillStyle=hat;ctx.fillRect(-11,-29,22,6);ctx.fillRect(-6,-34,12,5);
 ctx.fillStyle="#17131b";ctx.fillRect(-6,-18,3,4);ctx.fillRect(3,-18,3,4);
 ctx.fillStyle=skin;ctx.fillRect(-16,1,5,13);ctx.fillRect(11,1,5,13);
 ctx.fillStyle="#111";ctx.fillRect(-8,22,6,8);ctx.fillRect(2,22,6,8);ctx.restore()
}
function drawDuelist(x,y){ctx.save();ctx.translate(x,y);ctx.fillStyle="#8b3445";ctx.fillRect(-13,-2,26,26);ctx.fillStyle="#e1ad91";ctx.fillRect(-9,-22,18,17);ctx.fillStyle="#21151a";ctx.fillRect(-5,-16,3,3);ctx.fillRect(3,-16,3,3);ctx.fillStyle="#ddd";ctx.fillRect(13,-12,22,4);ctx.restore()}
function drawSentinel(x,y){ctx.save();ctx.translate(x,y);ctx.fillStyle="#716978";ctx.fillRect(-20,-22,40,43);ctx.fillStyle="#9a909f";ctx.fillRect(-15,-30,30,10);ctx.fillStyle="#79d8ff";ctx.fillRect(-13,-5,7,7);ctx.fillRect(6,-5,7,7);ctx.restore()}
function drawBoss(x,y){ctx.save();ctx.translate(x,y);ctx.fillStyle="#292552";ctx.beginPath();ctx.arc(0,0,34,0,Math.PI*2);ctx.fill();ctx.fillStyle="#08080f";ctx.beginPath();ctx.arc(12,-8,25,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ff435d";ctx.fillRect(-17,-4,7,7);ctx.fillRect(11,-4,7,7);ctx.restore()}
function dialog(){ctx.fillStyle="#000f";ctx.fillRect(32,68,576,205);ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.strokeRect(32,68,576,205);txt(dialogue[dialogueIndex]||"",57,120,14);txt("E / ESPAÇO / ENTER",57,247,11)}
function enemyPortrait(type,x,y){
 ctx.save();ctx.translate(x,y);let sh=battle.enemyShake?((Math.random()-.5)*battle.enemyShake):0;ctx.translate(sh,0);
 if(type==="bat"){ctx.fillStyle="#4e5685";ctx.beginPath();ctx.moveTo(-45,12);ctx.lineTo(-18,-18);ctx.lineTo(0,-6);ctx.lineTo(18,-18);ctx.lineTo(45,12);ctx.lineTo(16,8);ctx.lineTo(0,28);ctx.lineTo(-16,8);ctx.closePath();ctx.fill();ctx.fillStyle="#ff4760";ctx.fillRect(-18,-1,7,7);ctx.fillRect(11,-1,7,7)}
 else if(type==="sentinel"){ctx.fillStyle="#77707d";ctx.fillRect(-31,-35,62,70);ctx.fillStyle="#9a909f";ctx.beginPath();ctx.moveTo(-31,-35);ctx.lineTo(0,-50);ctx.lineTo(31,-35);ctx.closePath();ctx.fill();ctx.fillStyle="#78d8ff";ctx.fillRect(-20,-7,9,9);ctx.fillRect(11,-7,9,9)}
 else if(type==="duelist"){ctx.fillStyle="#8b3445";ctx.fillRect(-28,-28,56,58);ctx.fillStyle="#e1ad91";ctx.fillRect(-21,-50,42,30);ctx.fillStyle="#171116";ctx.fillRect(-13,-36,7,7);ctx.fillRect(7,-36,7,7);ctx.strokeStyle="#ddd";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(28,-18);ctx.lineTo(62,-45);ctx.stroke()}
 else{ctx.fillStyle="#292552";ctx.beginPath();ctx.arc(0,0,52,0,Math.PI*2);ctx.fill();ctx.fillStyle="#08080f";ctx.beginPath();ctx.arc(20,-12,38,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ff435d";ctx.fillRect(-28,-7,10,10);ctx.fillRect(19,-7,10,10)}
 ctx.restore()
}
function drawAttack(s){
 ctx.save();ctx.translate(s.x,s.y);
 if(s.kind==="slash"||s.kind==="blade"){ctx.rotate(-.55);ctx.strokeStyle="#fff";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-12,10);ctx.lineTo(12,-10);ctx.stroke();ctx.strokeStyle="#ff6678";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-9,11);ctx.lineTo(15,-9);ctx.stroke()}
 else if(s.kind==="punch"){ctx.fillStyle="#d85a55";ctx.fillRect(-8,-8,16,16);ctx.fillStyle="#f0ad8d";ctx.fillRect(-13,-4,7,9)}
 else{ctx.fillStyle="#f55";ctx.beginPath();ctx.arc(0,0,s.r,0,Math.PI*2);ctx.fill()}
 ctx.restore()
}
function battleDraw(){
 ctx.fillStyle="#07070c";ctx.fillRect(0,0,W,H);txt(battle.enemy,24,28,17);txt(`HP ${player.hp}/${player.maxHp}`,490,28,12);
 ctx.fillStyle="#3b1018";ctx.fillRect(250,48,140,10);ctx.fillStyle="#e85a62";ctx.fillRect(250,48,140*Math.max(0,battle.hp/battle.maxHp),10);
 enemyPortrait(battle.kind,410,105);
 if(battle.phase==="menu"||battle.phase==="enemy"){
  ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.strokeRect(75,155,490,165);
  if(battle.phase==="enemy"){
   drawHeart(battle.heart.x,battle.heart.y,1);
   for(const s of battle.shots)drawAttack(s);
   txt("DESVIE DOS GOLPES E CORTES!",320,145,10,"center")
  }else{
   txt(notice||"O que você fará?",95,185,13);
   ["LUTAR","AGIR","ITEM","POUPAR"].forEach((o,i)=>{ctx.strokeStyle=i===battle.choice?"#fff":"#555";ctx.strokeRect(92+i*116,245,102,40);txt(o,143+i*116,270,12,"center")})
  }
 }else if(battle.phase==="defeat"){
  const p=Math.min(1,battle.defeat/2.5),rise=p*45,alpha=1-p*.85;
  ctx.globalAlpha=alpha;ctx.translate(0,-rise);enemyPortrait(battle.kind,410,105);ctx.globalAlpha=1;
  txt(battle.result==="spared"?"O INIMIGO FOI POUPADO!":"VITÓRIA!",320,210,25,"center");
  txt(p>=1?"E / ESPAÇO / ENTER ou CLIQUE para continuar":"...",320,245,11,"center")
 }else{
  txt("VOCÊ CAIU...",320,205,27,"center");txt("E / ESPAÇO / ENTER ou CLIQUE",320,240,11,"center")
 }
}
function loop(t){const dt=Math.min(.033,(t-last)/1000||.016);last=t;update(dt);draw()}
requestAnimationFrame(loop);
