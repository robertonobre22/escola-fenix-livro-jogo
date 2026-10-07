const data=window.BOOK_DATA;
const $=s=>document.querySelector(s);
const app=$('#app'),cover=$('#cover'),book=$('#book'),page=$('#page'),body=$('#pageBody');
const imgWrap=$('#pageImageWrap'),img=$('#pageImage');
let current=null; let master=false;
const visited=new Set(JSON.parse(localStorage.getItem('vitaumVisited')||'[]'));
const completedPockets=new Set(JSON.parse(localStorage.getItem('vitaumPockets')||'[]'));

$('#coverImg').src=window.BOOK_IMAGES.cover;
$('#coverImg').onerror=()=>$('#coverImg').style.display='none';
function persist(){localStorage.setItem('vitaumVisited',JSON.stringify([...visited]));localStorage.setItem('vitaumPockets',JSON.stringify([...completedPockets]));}
function esc(s){const d=document.createElement('div'); d.textContent=s; return d.innerHTML}
function goto(n, animate=true){
  const target=data.find(x=>x.num===n); if(!target)return;
  if(animate && current!==null){page.classList.add('turning');setTimeout(()=>{render(target);page.classList.remove('turning')},220)} else render(target);
}
function render(p){
  current=p.num; visited.add(p.num); persist(); cover.classList.remove('active');book.classList.add('active');
  $('#folioNum').textContent=`Folha ${String(p.num).padStart(2,'0')}`; $('#footerNum').textContent=String(p.num).padStart(2,'0'); $('#eyebrow').textContent=`Folha ${String(p.num).padStart(2,'0')}`; $('#pageTitle').textContent=p.title;
  if(p.image){imgWrap.classList.add('show');img.src=p.image;img.alt=`Ilustração — ${p.title}`;img.onerror=()=>imgWrap.classList.remove('show')}else{imgWrap.classList.remove('show');img.removeAttribute('src')}
  body.innerHTML=''; let navStack=null;
  p.body.forEach(item=>{
    if(item.type==='nav'){
      if(!navStack){navStack=document.createElement('div');navStack.className='nav-stack';body.appendChild(navStack)}
      const b=document.createElement('button');b.className='navbtn';b.textContent=item.label;
      if(item.target===9){b.classList.add('wait'); b.onclick=()=>{ if(master || completedPockets.size>=3) goto(9); else alert('A Folha 09 só é liberada quando os três grupos concluírem seus bolsos.'); }} else b.onclick=()=>goto(item.target);
      navStack.appendChild(b);return;
    }
    navStack=null;
    const el=document.createElement(item.type==='result_head'?'h3':'p');
    if(item.type==='result_head') el.className='result-head';
    if(item.type==='mechanic') el.className='mechanic';
    if(item.type==='end') el.className='endmark';
    el.textContent=item.text; body.appendChild(el);
  });
  if([6,18,19].includes(p.num)){
    const mark=document.createElement('button'); mark.className='navbtn'; mark.style.marginTop='14px'; mark.textContent=completedPockets.has(p.num)?'✓ Este bolso já foi concluído':'Marcar este bolso como concluído';
    mark.onclick=()=>{completedPockets.add(p.num);persist();render(p)};body.appendChild(mark);
  }
  $('#statusText').textContent=`Folha ${String(p.num).padStart(2,'0')} · ${p.title}`; $('#visitedText').textContent=`${visited.size}/20 visitadas`; $('#progressFill').style.width=`${visited.size/20*100}%`;
  document.title=`Folha ${String(p.num).padStart(2,'0')} — ${p.title}`; page.querySelector('.paper').scrollTop=0;
}
function showCover(){current=null;book.classList.remove('active');cover.classList.add('active');$('#statusText').textContent='Capa';document.title='A Bolsa, o Vômito e o Ano Letivo — Livro-jogo'}
function buildToc(){const list=$('#tocList');data.forEach(p=>{const b=document.createElement('button');b.className='toc-item';b.innerHTML=`<strong>Folha ${String(p.num).padStart(2,'0')}</strong><small>${esc(p.title)}</small>`;b.onclick=()=>{goto(p.num,false);closeToc()};list.appendChild(b)})}
function openToc(){$('#toc').classList.add('open');$('#toc').setAttribute('aria-hidden','false')} function closeToc(){$('#toc').classList.remove('open');$('#toc').setAttribute('aria-hidden','true')}
$('#startBtn').onclick=()=>goto(1,false);$('#homeBtn').onclick=showCover;$('#tocBtn').onclick=openToc;$('#tocClose').onclick=closeToc;
$('#masterBtn').onclick=()=>{master=!master;app.classList.toggle('master',master);$('#masterBtn').textContent=master?'Modo mestre':'Modo jogadoras'; if(current)render(data.find(x=>x.num===current))};
$('#fsBtn').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
buildToc(); showCover();