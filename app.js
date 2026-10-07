const data=window.BOOK_DATA;
const $=s=>document.querySelector(s);
const app=$('#app'),cover=$('#cover'),book=$('#book'),page=$('#page'),body=$('#pageBody');
const imgWrap=$('#pageImageWrap'),img=$('#pageImage');
let current=null; let master=false;
const visited=new Set(JSON.parse(localStorage.getItem('vitaumVisited')||'[]'));
const completedPockets=new Set(JSON.parse(localStorage.getItem('vitaumPockets')||'[]'));
const pocketResults=JSON.parse(localStorage.getItem('vitaumPocketResults')||'{}');
const bossResults=JSON.parse(localStorage.getItem('vitaumBossResults')||'{}');

const resultLabels={sh:'Sucesso com Esperança',sm:'Sucesso com Medo',fh:'Fracasso com Esperança',fm:'Fracasso com Medo'};
const resultFromHeading={'Sucesso com Esperança':'sh','Sucesso com Medo':'sm','Fracasso com Esperança':'fh','Fracasso com Medo':'fm'};
const pocketNames={6:'Poções',18:'Pergaminhos',19:'Roupas'};
const challengeInfo={
  7:{name:'Pergaminhos',cause:'Traças de gosma apagam textos, fórmulas, mapas e cadernos.',preserve:'O acervo, especialmente os cadernos antigos ainda intactos.',cd11:'Conter as traças sem espalhar gosma e proteger diretamente o acervo.',cd13:'Só bater, empurrar ou atrasar as traças, arriscando espalhar gosma ou danificar páginas.'},
  15:{name:'Poções',cause:'Raízes, fungos e água contaminada reagem com frascos e ingredientes.',preserve:'Frascos instáveis, venenos, perfumes, poções, ingredientes e a mesa central.',cd11:'Conter a contaminação sem quebrar frascos, misturar substâncias ou espalhar vapores.',cd13:'Só cortar raízes, secar água ou atacar fungos sem controlar a reação geral.'},
  10:{name:'Roupas',cause:'Fios contaminados controlam roupas como títeres; nós de gosma dão corpo às peças.',preserve:'Roupas, uniformes, capas, sapatos, botas e acessórios recuperáveis.',cd11:'Separar roupa boa, gosma e fios de controle sem rasgar, queimar ou destruir.',cd13:'Golpear bonecos, arrancar botas ou puxar fios com força, espalhando gosma ou destruindo peças boas.'}
};
const bossCharacters=['Mira','Nix','Tereza','Seraphine','Tânia','Elaris','Zuri'];

$('#coverImg').src=window.BOOK_IMAGES.cover;
$('#coverImg').onerror=()=>$('#coverImg').style.display='none';
function persist(){
  localStorage.setItem('vitaumVisited',JSON.stringify([...visited]));
  localStorage.setItem('vitaumPockets',JSON.stringify([...completedPockets]));
  localStorage.setItem('vitaumPocketResults',JSON.stringify(pocketResults));
  localStorage.setItem('vitaumBossResults',JSON.stringify(bossResults));
}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function updateStatus(){
  $('#visitedText').textContent=`${visited.size}/20 visitadas`;
  $('#progressFill').style.width=`${visited.size/20*100}%`;
}
function resetReading(){
  const ok=confirm('Reiniciar esta leitura? Isso apaga páginas visitadas, resultados dos bolsos e o progresso do confronto final neste navegador.');
  if(!ok)return;
  visited.clear();completedPockets.clear();
  Object.keys(pocketResults).forEach(k=>delete pocketResults[k]);
  Object.keys(bossResults).forEach(k=>delete bossResults[k]);
  ['vitaumVisited','vitaumPockets','vitaumPocketResults','vitaumBossResults'].forEach(k=>localStorage.removeItem(k));
  updateStatus();showCover();
}
function goto(n,animate=true){
  const target=data.find(x=>x.num===n);if(!target)return;
  if(animate&&current!==null){page.classList.add('turning');setTimeout(()=>{render(target);page.classList.remove('turning')},220)}else render(target);
}
function makeMechanicToggle(p){
  const info=challengeInfo[p.num];if(!info)return null;
  const wrap=document.createElement('section');wrap.className='rules-card';
  const toggle=document.createElement('button');toggle.className='rules-toggle';toggle.textContent='🎲 Como resolver este desafio';
  const panel=document.createElement('div');panel.className='rules-panel';panel.hidden=true;
  panel.innerHTML=`<p><strong>1.</strong> Descrevam uma ação conjunta usando as capacidades das personagens.</p><p><strong>2.</strong> Cada personagem rola <strong>2d12</strong> com uma habilidade, atributo, experiência ou modificador pertinente da própria ficha. Depois, o grupo escolhe <strong>uma</strong> das rolagens para representar o resultado coletivo.</p><div class="rule-grid"><div><strong>CD 11</strong><span>A ação enfrenta a causa real do problema e protege o que precisa ser salvo.</span></div><div><strong>CD 13</strong><span>A ação é parcial, bruta, indireta, improvisada demais ou cria risco para o que deveria ser preservado.</span></div></div><p><strong>Causa:</strong> ${esc(info.cause)}</p><p><strong>Preservar:</strong> ${esc(info.preserve)}</p><p><strong>Exemplo de CD 11:</strong> ${esc(info.cd11)}</p><p><strong>Exemplo de CD 13:</strong> ${esc(info.cd13)}</p><div class="advantage-note"><strong>⭐ Vantagem compartilhada:</strong> se o grupo chegou ao reencontro pelas Folhas <strong>17, 11 ou 16</strong>, uma personagem pode declarar antes da rolagem que vai usar a vantagem e adicionar <strong>+1d6</strong>. Depois disso, a vantagem é gasta.</div>`;
  toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.textContent=panel.hidden?'🎲 Como resolver este desafio':'🎲 Ocultar mecânica do desafio'};
  wrap.append(toggle,panel);return wrap;
}
function setPocketResult(pageNum,result){
  pocketResults[pageNum]=result;completedPockets.add(pageNum);persist();render(data.find(x=>x.num===pageNum));
}
function makePocketResultPanel(pageNum){
  const card=document.createElement('section');card.className='result-selector';
  const selected=pocketResults[pageNum];
  const title=document.createElement('h3');title.textContent=`Registrar resultado — ${pocketNames[pageNum]}`;card.appendChild(title);
  const intro=document.createElement('p');intro.textContent='Depois das rolagens, escolham o resultado coletivo. Isso registra o bolso como concluído e atualiza automaticamente a Dificuldade do confronto final.';card.appendChild(intro);
  const grid=document.createElement('div');grid.className='result-buttons';
  Object.entries(resultLabels).forEach(([key,label])=>{const b=document.createElement('button');b.className='result-btn'+(selected===key?' selected':'');b.textContent=label;b.onclick=()=>setPocketResult(pageNum,key);grid.appendChild(b)});
  card.appendChild(grid);
  if(selected){
    const effects={sh:'−1 na Dificuldade do boss final.',sm:'Nenhuma alteração na Dificuldade do boss.',fh:'As personagens deste grupo recebem −1 nos testes contra o boss final.',fm:'+1 na Dificuldade do boss final para todo o grupo.'};
    const note=document.createElement('div');note.className='result-effect';note.innerHTML=`<strong>Resultado registrado:</strong> ${resultLabels[selected]}<br><span>${effects[selected]}</span>`;card.appendChild(note);
  }
  return card;
}
function bossDifficulty(){
  let d=14;Object.values(pocketResults).forEach(r=>{if(r==='sh')d--;if(r==='fm')d++});return d;
}
function bossCounts(){
  let success=0,fail=0;
  Object.values(bossResults).forEach(r=>{if(r==='crit')success+=2;else if(r==='sh'||r==='sm')success++;else if(r==='fh'||r==='fm')fail++});
  return{success,fail};
}
function makeBossPanel(){
  const card=document.createElement('section');card.className='boss-card';
  const difficulty=bossDifficulty();
  const pocketEntries=[6,18,19].map(n=>({n,name:pocketNames[n],r:pocketResults[n]}));
  const unresolved=pocketEntries.filter(x=>!x.r);
  const fh=pocketEntries.filter(x=>x.r==='fh').map(x=>x.name);
  const summary=document.createElement('div');summary.className='boss-summary';
  summary.innerHTML=`<div><span>Dificuldade inicial</span><strong>14</strong></div><div><span>Dificuldade atual</span><strong>${difficulty}</strong></div><div><span>Bolsos registrados</span><strong>${3-unresolved.length}/3</strong></div>`;
  card.appendChild(summary);
  const detail=document.createElement('p');detail.className='boss-detail';
  detail.innerHTML=`A Dificuldade começa em <strong>14</strong>. Cada <strong>Sucesso com Esperança</strong> nos bolsos reduz 1; cada <strong>Fracasso com Medo</strong> aumenta 1.${fh.length?` <strong>Fracasso com Esperança:</strong> o grupo que resolveu ${fh.join(', ')} recebe −1 nos próprios testes contra o boss.`:''}`;
  card.appendChild(detail);
  const toggle=document.createElement('button');toggle.className='rules-toggle';toggle.textContent='⚔️ Abrir painel do confronto';card.appendChild(toggle);
  const panel=document.createElement('div');panel.className='boss-panel';panel.hidden=true;
  const rules=document.createElement('div');rules.className='boss-rules';
  rules.innerHTML='<p>Cada uma das sete personagens declara uma ação verdadeira para ela e rola uma vez contra a Dificuldade final. Magias, habilidades e manobras que normalmente pediriam uma resistência do alvo viram uma rolagem da própria personagem com o modificador pertinente.</p><p><strong>Contagem:</strong> sucesso = 1 sucesso; crítico = 2 sucessos; fracasso = 1 fracasso. Com 4 sucessos, vitória. Com 4 fracassos, derrota. Mesmo que o resultado seja alcançado antes, deixem todas as sete aparecerem na narração final.</p>';
  panel.appendChild(rules);
  const tracker=document.createElement('div');tracker.className='boss-tracker';
  bossCharacters.forEach(name=>{
    const row=document.createElement('div');row.className='boss-row';
    const who=document.createElement('strong');who.textContent=name;row.appendChild(who);
    const opts=document.createElement('div');opts.className='boss-options';
    [['sh','Sucesso + Esperança'],['sm','Sucesso + Medo'],['fh','Fracasso + Esperança'],['fm','Fracasso + Medo'],['crit','Crítico · 2 sucessos']].forEach(([key,label])=>{const b=document.createElement('button');b.className='boss-result'+(bossResults[name]===key?' selected':'');b.textContent=label;b.onclick=()=>{bossResults[name]=key;persist();render(data.find(x=>x.num===9))};opts.appendChild(b)});
    row.appendChild(opts);tracker.appendChild(row);
  });
  panel.appendChild(tracker);
  const counts=bossCounts();const tally=document.createElement('div');tally.className='boss-tally';
  tally.innerHTML=`<strong>${counts.success} sucessos</strong><span>·</span><strong>${counts.fail} fracassos</strong>`;
  if(counts.success>=4)tally.innerHTML+=`<span class="victory">Vitória alcançada → Folha 14</span>`;
  if(counts.fail>=4)tally.innerHTML+=`<span class="defeat">Derrota alcançada → Folha 05</span>`;
  panel.appendChild(tally);
  toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.textContent=panel.hidden?'⚔️ Abrir painel do confronto':'⚔️ Ocultar painel do confronto'};
  card.appendChild(panel);return card;
}
function render(p){
  current=p.num;visited.add(p.num);persist();cover.classList.remove('active');book.classList.add('active');
  $('#folioNum').textContent=`Folha ${String(p.num).padStart(2,'0')}`;$('#footerNum').textContent=String(p.num).padStart(2,'0');$('#eyebrow').textContent=`Folha ${String(p.num).padStart(2,'0')}`;$('#pageTitle').textContent=p.title;
  if(p.image){imgWrap.classList.add('show');img.src=p.image;img.alt=`Ilustração — ${p.title}`;img.onerror=()=>imgWrap.classList.remove('show')}else{imgWrap.classList.remove('show');img.removeAttribute('src')}
  body.innerHTML='';
  const mech=makeMechanicToggle(p);if(mech)body.appendChild(mech);
  if([6,18,19].includes(p.num))body.appendChild(makePocketResultPanel(p.num));
  if(p.num===9)body.appendChild(makeBossPanel());
  let navStack=null;let currentResultSection=null;const selectedPocketResult=pocketResults[p.num];
  p.body.forEach(item=>{
    if(item.type==='result_head')currentResultSection=resultFromHeading[item.text]||null;
    if([6,18,19].includes(p.num)&&currentResultSection&&selectedPocketResult!==currentResultSection)return;
    if(item.type==='nav'){
      currentResultSection=null;
      if(!navStack){navStack=document.createElement('div');navStack.className='nav-stack';body.appendChild(navStack)}
      const b=document.createElement('button');b.className='navbtn';b.textContent=item.label;
      if(item.target===9){b.classList.add('wait');b.onclick=()=>{if(master||Object.keys(pocketResults).filter(k=>[6,18,19].includes(Number(k))).length>=3)goto(9);else alert('A Folha 09 só é liberada quando os três bolsos tiverem um resultado registrado.')}}
      else if(p.num===9&&item.target===14){b.onclick=()=>{const c=bossCounts();if(master||c.success>=4)goto(14);else alert('A vitória é liberada quando o grupo acumular 4 sucessos.')}}
      else if(p.num===9&&item.target===5){b.onclick=()=>{const c=bossCounts();if(master||c.fail>=4)goto(5);else alert('A derrota é liberada quando o grupo acumular 4 fracassos.')}}
      else b.onclick=()=>goto(item.target);
      navStack.appendChild(b);return;
    }
    navStack=null;
    const el=document.createElement(item.type==='result_head'?'h3':'p');
    if(item.type==='result_head')el.className='result-head';
    if(item.type==='mechanic')el.className='mechanic';
    if(item.type==='end')el.className='endmark';
    el.textContent=item.text;body.appendChild(el);
  });
  $('#statusText').textContent=`Folha ${String(p.num).padStart(2,'0')} · ${p.title}`;updateStatus();
  document.title=`Folha ${String(p.num).padStart(2,'0')} — ${p.title}`;page.querySelector('.paper').scrollTop=0;
}
function showCover(){current=null;book.classList.remove('active');cover.classList.add('active');$('#statusText').textContent='Capa';updateStatus();document.title='A Bolsa, o Vômito e o Ano Letivo — Livro-jogo'}
function buildToc(){const list=$('#tocList');data.forEach(p=>{const b=document.createElement('button');b.className='toc-item';b.innerHTML=`<strong>Folha ${String(p.num).padStart(2,'0')}</strong><small>${esc(p.title)}</small>`;b.onclick=()=>{goto(p.num,false);closeToc()};list.appendChild(b)})}
function openToc(){$('#toc').classList.add('open');$('#toc').setAttribute('aria-hidden','false')}function closeToc(){$('#toc').classList.remove('open');$('#toc').setAttribute('aria-hidden','true')}
$('#startBtn').onclick=()=>goto(1,false);$('#homeBtn').onclick=showCover;$('#tocBtn').onclick=openToc;$('#tocClose').onclick=closeToc;$('#resetBtn').onclick=resetReading;
$('#masterBtn').onclick=()=>{master=!master;app.classList.toggle('master',master);$('#masterBtn').textContent=master?'Modo mestre':'Modo jogadoras';if(current)render(data.find(x=>x.num===current))};
$('#fsBtn').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
buildToc();showCover();