const K='kucingku-v1',$=s=>document.querySelector(s);
const SCHEMA_VERSION=2,MAX_WEIGHT=30000,MAX_COST=1000000,MAX_IMPORT_BYTES=10*1024*1024;
let S={version:SCHEMA_VERSION,cats:[],recs:[],vets:[],bk:0},view='home',cid=null,tab='berat',PH;

let persistedState=JSON.stringify(S),storageReadError=false,rawStorage='';
function save(recover=false){
try{
if(storageReadError&&!recover)throw new Error('unreadable-storage');
const json=JSON.stringify(S);localStorage.setItem(K,json);persistedState=json;storageReadError=false;return true;
}catch(e){
S=JSON.parse(persistedState);
toast(storageReadError?'Data storan tidak dapat dibaca. Export salinan asal atau import backup dahulu.':'Gagal menyimpan. Data terdahulu dikekalkan; cuba lagi atau buat backup.');
return false;
}}

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,10),cat=id=>S.cats.find(c=>c.id===id);
const td=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const dd=d=>Math.round((new Date(d+'T00:00')-new Date(td()+'T00:00'))/864e5);
const fd=d=>new Date(d+'T00:00').toLocaleDateString('ms-MY',{day:'numeric',month:'short',year:'numeric'});
const fw=v=>v>=1000?(v/1000).toFixed(2).replace(/\.?0+$/,'')+' kg':v+' g';
const age=d=>{if(!d)return'';const n=-dd(d);if(n<0)return'';const m=mAge(d),dy=dif(addM(d,m),td());return Math.floor(n/7)+' minggu ('+(m?m+' bulan ':'')+dy+' hari)'};
const COL=['#F2728F','#B58CF0','#F6A36B','#6CC3B0','#7FA6F5','#E8588D'];
const T={berat:'Berat',vaksin:'Vaksin',cacing:'Ubat cacing / kutu',lawatan:'Lawatan vet',sihat:'Kesihatan'};
const I={jd:'<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/>',more:'<path d="M5.5 12h.01M12 12h.01M18.5 12h.01" stroke-width="3.2"/>',vet:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>',home:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',cats:'<circle cx="6.5" cy="10" r="1.8"/><circle cx="10" cy="5.5" r="1.8"/><circle cx="14" cy="5.5" r="1.8"/><circle cx="17.5" cy="10" r="1.8"/><path d="M12 11c-3 0-5.5 3-5.5 5.5 0 2 1.7 2.5 3 2.5 1 0 1.5-.5 2.5-.5s1.5.5 2.5.5c1.3 0 3-.5 3-2.5 0-2.5-2.5-5.5-5.5-5.5z"/>',bk:'<path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/>'};
function toast(m){const t=$('#t');t.textContent=m;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>t.hidden=true,2400)}
const GP=c=>c.sex==='Jantan'?{bg:'#DCEBFF',ear:'#BBD4F5',inn:'#E3EEFC',bl:'#9CC2F5',no:'#7FA6DA',pt:'#C9DDF7',ln:'#6F9BD6'}:{bg:'#FFE3EA',ear:'#F7C6D0',inn:'#FBE1E7',bl:'#F9B8C6',no:'#E98AA0',pt:'#F5C9A5',ln:'#E27C97'};
const face=c=>{const g=GP(c);return `<svg viewBox="0 0 120 120" role="img" aria-label="${esc(c.name)}"><rect width="120" height="120" fill="${g.bg}"/><path d="M22 62 18 24 46 42ZM98 62 102 24 74 42Z" fill="${g.ear}"/><path d="M26 56 24 34 40 44ZM94 56 96 34 80 44Z" fill="${g.inn}"/><ellipse cx="60" cy="78" rx="46" ry="38" fill="#FFF6EC"/><ellipse cx="38" cy="60" rx="13" ry="9" fill="${g.pt}" opacity=".85"/><circle cx="43" cy="76" r="5" fill="#5A4558"/><circle cx="77" cy="76" r="5" fill="#5A4558"/><circle cx="45" cy="74" r="1.6" fill="#fff"/><circle cx="79" cy="74" r="1.6" fill="#fff"/><ellipse cx="32" cy="88" rx="8" ry="5" fill="${g.bl}" opacity=".7"/><ellipse cx="88" cy="88" rx="8" ry="5" fill="${g.bl}" opacity=".7"/><path d="M55 86q5 5 10 0" stroke="#5A4558" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M60 82l-3-2h6z" fill="${g.no}"/></svg>`};
function av(c){return `<span class="av ${c.sex==='Jantan'?'j':'b'}">${c.photo?`<img src="${c.photo}" alt="${esc(c.name)}">`:face(c)}</span>`}
const lastW=id=>S.recs.filter(r=>r.cat===id&&r.type==='berat'&&r.date<=td()).sort((a,b)=>b.date.localeCompare(a.date))[0];
function tasks(){const o=[],T0=td();S.cats.forEach(c=>{const p=plan(c);if(!p)return;[['berat',p.t],['vaksin',p.v],['cacing',p.w]].forEach(([t,x])=>{const d=dif(T0,x.d);if(d<=30)o.push({c,t,l:x.l,date:x.d,d})})});S.recs.forEach(r=>{if(r.type!=='lawatan')return;const c=cat(r.cat),d=dif(T0,r.date);if(c&&d>=0&&d<=30)o.push({c,t:'lawatan',l:r.name+(r.time?' · '+r.time:''),date:r.date,d})});return o.sort((a,b)=>a.d-b.d)}
const VER='1.1.0';
const TL={vaksin:'Vaksin core',cacing:'Ubat cacing',berat:'Timbang berat',lawatan:'Temujanji vet'};
const rel=d=>d<0?'Lewat '+-d+' hari':d===0?'Hari ini':d===1?'Esok':d+' hari lagi';
const trow=({c,t,l,date,d})=>`<button class="row" data-action="task" data-id="${c.id}" data-type="${t}">${av(c)}<span><b>${TL[t]} ${esc(c.name)}</b><span class="mute">${esc(l)} · ${t==='lawatan'?'':'±'}${fd(date)}</span></span><span class="pill ${d<0?'bad':''}">${rel(d)}</span></button>`;
function jdv(){const k=tasks(),G=[['Lewat',x=>x.d<0],['Hari ini',x=>x.d===0],['7 hari akan datang',x=>x.d>0&&x.d<=7],['8 hingga 30 hari',x=>x.d>7]];
const em=m=>`<div class="ok">${ZZ}<p class="mute">${m}</p></div>`;
return `<h2 style="margin-top:12px">Jadual</h2><p class="mute">Rawatan, timbang dan temujanji dalam 30 hari akan datang.</p>`+(S.cats.length?(G.map(([t,f])=>{const l=k.filter(f);return l.length?`<h3 class="gh">${t}</h3>`+l.map(trow).join(''):''}).join('')||em('Tiada apa-apa dalam 30 hari akan datang.')):em('Tambah kucing untuk melihat jadual.'))}
function morev(){const m=(v,i,t,s)=>`<button class="row mr" data-action="go" data-view="${v}"><svg viewBox="0 0 24 24" aria-hidden="true">${I[i]}</svg><span><b>${t}</b><span class="mute">${s}</span></span><span class="chev">›</span></button>`;
return `<h2 style="margin-top:12px">Lagi</h2>`+m('vet','vet','Vet',S.vets.length?S.vets.length+' klinik disimpan':'Simpan klinik dan nombor telefon')+m('bk','bk','Backup',S.bk?'Terakhir '+fd(iso(new Date(S.bk))):'Belum ada backup')+`<p class="mute" style="text-align:center;margin-top:26px">Kucingku v${VER}</p>`}
const vlink=v=>{try{const u=new URL(v.addr);if(/^https?:$/.test(u.protocol))return u.href}catch(e){}return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent((v.name+' '+v.addr).trim())};
const vn=r=>{const v=S.vets.find(x=>x.id===r.clinic);return v?' · '+esc(v.name):''};
function vetv(){const V=S.vets.slice().sort((a,b)=>b.main-a.main||a.name.localeCompare(b.name));
return `<button class="bk" data-action="go" data-view="more">‹ Lagi</button><div class="kh"><h2>Vet</h2><button class="btn" style="margin:0;padding:10px 18px" data-action="vetForm">+ Tambah</button></div>`+(V.length?V.map(v=>`<div class="card vc"><div class="vh"><b class="kn">${esc(v.name)}</b><span class="chips">${v.main?'<span class="chip">Klinik utama</span>':''}${v.h24?'<span class="chip">24 jam</span>':''}</span></div>${v.doc?`<p class="mute">${esc(v.doc)}</p>`:''}${v.hours?`<p>${esc(v.hours)}</p>`:''}${v.addr&&!/^https?:/i.test(v.addr)?`<p>${esc(v.addr)}</p>`:''}${v.note?`<p class="mute">${esc(v.note)}</p>`:''}<div class="acts">${v.tel?`<a class="btn" href="tel:${esc(v.tel.replace(/\s/g,''))}">Telefon</a>`:''}<a class="btn g" href="${esc(vlink(v))}" target="_blank" rel="noopener">Peta</a><button class="btn g" data-action="vetForm" data-id="${v.id}">Edit</button></div></div>`).join(''):`<div class="ok">${ZZ}<p class="mute">Belum ada klinik. Tambah klinik yang anda gunakan supaya nombor telefonnya sentiasa dekat.</p></div>`)}
function vetForm(id){const v=id?S.vets.find(x=>x.id===id):{};
sheet(`<h2>${id?'Edit klinik':'Tambah klinik'}</h2><form data-submit="vet" data-id="${id||''}">${L('Nama klinik',`<input name="name" required value="${esc(v.name)}">`)}${L('Telefon',`<input name="tel" type="tel" inputmode="tel" value="${esc(v.tel)}" placeholder="cth. 03-1234 5678">`)}${L('Alamat atau pautan peta',`<input name="addr" value="${esc(v.addr)}" placeholder="Alamat, atau tampal pautan Google Maps">`)}${L('Waktu operasi',`<input name="hours" value="${esc(v.hours)}" placeholder="cth. Isnin hingga Sabtu, 9 pagi hingga 8 malam">`)}${L('Nama doktor',`<input name="doc" value="${esc(v.doc)}">`)}${L('Catatan',`<input name="note" value="${esc(v.note)}">`)}<label class="ck"><input type="checkbox" name="main"${v.main?' checked':''}> Klinik utama</label><label class="ck"><input type="checkbox" name="h24"${v.h24?' checked':''}> Buka 24 jam</label><button class="btn">Simpan</button>${id?`<button type="button" class="btn r" data-action="delVet" data-id="${id}">Padam klinik ini</button>`:''}</form>`)}
function saveVet(e,id){e.preventDefault();const o=Object.fromEntries(new FormData(e.target));if(!(o.name||'').trim()){toast('Masukkan nama klinik');return}o.main=!!o.main;o.h24=!!o.h24;o.tel=(o.tel||'').replace(/[^\d+\-\s()]/g,'');if(!id&&!S.vets.length)o.main=true;if(o.main)S.vets.forEach(x=>x.main=false);
if(id)Object.assign(S.vets.find(x=>x.id===id),o);else S.vets.push({id:uid(),...o});if(!save())return;closeSh();render();toast('Klinik disimpan')}
function delVet(id){ask('Padam klinik ini?','Padam',()=>{S.vets=S.vets.filter(v=>v.id!==id);S.recs.forEach(r=>{if(r.clinic===id)delete r.clinic});if(!save()){render();return}render();toast('Klinik dipadam')})}
const clinicSel=r=>S.vets.length?L('Klinik',`<select name="clinic"><option value="">-</option>${S.vets.slice().sort((a,b)=>b.main-a.main).map(v=>`<option value="${v.id}"${(r.clinic||(!r.id&&v.main?v.id:''))===v.id?' selected':''}>${esc(v.name)}</option>`).join('')}</select>`):'';
const costIn=r=>L('Kos (RM)',`<input name="cost" type="number" inputmode="decimal" step="0.01" min="0" placeholder="Pilihan" value="${r.cost||''}">`);
function go(v){view=v;scrollTo(0,0);render()}
const LS=[['Anak kucing','0–6 bulan',0,'Membesar pantas. Fokus pada vaksin, ubat cacing dan makanan anak kucing.'],['Remaja','6 bulan–2 tahun',6,'Tenaga tinggi dan suka meneroka. Masa untuk fikir tentang pemandulan.'],['Dewasa','2–6 tahun',24,'Berat dan tenaga stabil. Pemeriksaan vet setahun sekali.'],['Matang','7–10 tahun',84,'Pantau berat, gigi dan selera makan dengan lebih rapi.'],['Senior','11–14 tahun',132,'Pemeriksaan vet lebih kerap, kira-kira setiap 6 bulan.'],['Warga emas','15 tahun ke atas',180,'Jagaan penuh kasih dan pemeriksaan kerap.']];
const TIPS=[['Vaksin dan ubat cacing ikut jadual','Makanan khas kitten dan air bersih sentiasa','Timbang berat setiap hari hingga sapih, kemudian sekurang-kurangnya setiap minggu'],['Banyakkan masa bermain bersama','Fikir tentang pemandulan (neuter/spay)','Tukar makanan secara berperingkat bila sesuai'],['Pemeriksaan vet setahun sekali','Jaga berat badan yang ideal','Booster vaksin ikut nasihat vet'],['Pantau berat dan selera makan','Jaga kebersihan gigi','Pemeriksaan vet secara berkala'],['Pemeriksaan vet kira-kira setiap 6 bulan','Pantau pengambilan air dan berat','Sediakan tempat tidur yang selesa'],['Pemeriksaan vet yang lebih kerap','Pilih makanan yang mudah dicerna','Beri persekitaran yang tenang dan selesa']];
const iso=x=>new Date(x-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const stI=c=>{if(!c.dob||dif(c.dob,td())<0)return -1;const m=mAge(c.dob);let i=0;LS.forEach((x,j)=>{if(m>=x[2])i=j});return i};
const stN=c=>{const i=stI(c);return i<0?'':LS[i][0]};
const lsT=c=>{const i=stI(c);if(i<0)return'';const a=new Date(c.dob+'T00:00'),b=new Date(td()+'T00:00'),p=c.dobx==='Anggaran'?'±':'',nx=LS[i+1];let note='';
if(nx){const x=new Date(addM(c.dob,nx[2])+'T00:00'),w=Math.max(0,Math.ceil((x-b)/6048e5));note=`<div class="nx"><div>Fasa seterusnya<br><b>${nx[0]}</b></div><span>${p}${fd(iso(x))}<br>${p}${w} minggu lagi</span></div>`}
return `<h2>Kitaran hidup</h2><div class="card"><div class="lc">${LS.map((x,j)=>`<div class="ls${j<i?' d':''}${j===i?' n':''}"><i></i><span><b>${x[0]}</b><small>${x[1]}</small></span>${j===i?'<span class="pill">Sekarang</span>':''}</div>`).join('')}</div>${note}<div class="tips"><b>Petua jagaan</b>${TIPS[i].map(t=>`<div class="tp">${t}</div>`).join('')}<small>Panduan umum. Rujuk doktor haiwan untuk nasihat khusus.</small></div></div>`};
const ageT=c=>c.dob?(c.dobx==='Anggaran'?'±':'')+age(c.dob):'';
const pcard=c=>{const R=(k,v)=>v?`<div class="pf"><span>${k}</span><b>${esc(v)}</b></div>`:'';return `<div class="pc"><div class="pt"><div><h1>${esc(c.name)}</h1><span class="rib">Profil &amp; Rekod</span></div>${av(c)}</div>${c.sex?`<div class="gp">${esc(c.sex)}</div>`:''}${R('Tarikh lahir',c.dob?fd(c.dob)+(c.dobx==='Anggaran'?' (anggaran)':''):'')}${R('Umur',ageT(c))}${R('Fasa',stN(c))}${R('Baka',c.breed)}${R('Warna / corak',c.pattern)}${R('No. microchip',c.chip)}${R('Catatan',c.note)}<div class="acts"><button class="bk" data-action="catForm" data-id="${c.id}">Edit profil</button><button class="bk" data-action="pdfCat" data-id="${c.id}">Export PDF</button></div></div>`};
const okD=x=>{
if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
const d=new Date(x+'T00:00');return !isNaN(d)&&iso(d)===x;
};
// Preserve existing text on reload; storage failure is handled transactionally.
const str=x=>typeof x==='string'?x:'';
const validWeight=v=>Number.isFinite(v)&&Number.isInteger(v)&&v>0&&v<=MAX_WEIGHT;
const validCost=v=>Number.isFinite(v)&&v>=0&&v<=MAX_COST;
const validTime=x=>/^([01]\d|2[0-3]):[0-5]\d$/.test(x);
const validPhoto=x=>typeof x==='string'&&/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(x);
function clean(d){const id=x=>typeof x==='string'&&/^\w{1,40}$/.test(x),cats=[],ids=new Set,T=['berat','vaksin','cacing','lawatan','sihat'],recs=[],rids=new Set;
(Array.isArray(d.cats)?d.cats:[]).forEach(c=>{if(!c||typeof c!=='object'||!id(c.id)||ids.has(c.id))return;ids.add(c.id);const o={id:c.id,name:str(c.name,60)||'Tanpa nama',color:/^#[0-9a-f]{6}$/i.test(c.color)?c.color:COL[cats.length%6]};
['sex','breed','pattern','chip','note'].forEach(k=>{if(c[k])o[k]=str(c[k])});
if(okD(c.dob)){o.dob=c.dob;o.dobx=c.dobx==='Anggaran'?'Anggaran':'Tepat'}
if(validPhoto(c.photo))o.photo=c.photo;
if(c.ms&&typeof c.ms==='object'&&okD(c.ms.md))o.ms={md:c.ms.md};
cats.push(o)});
const vets=[],vids=new Set;(Array.isArray(d.vets)?d.vets:[]).forEach(v=>{if(!v||typeof v!=='object'||!id(v.id)||vids.has(v.id))return;vids.add(v.id);vets.push({id:v.id,name:str(v.name,80)||'Klinik',tel:str(v.tel,30).replace(/[^\d+\-\s()]/g,''),addr:str(v.addr,300),hours:str(v.hours,120),doc:str(v.doc,80),note:str(v.note,300),main:!!v.main&&!vets.some(x=>x.main),h24:!!v.h24})});
(Array.isArray(d.recs)?d.recs:[]).forEach(r=>{if(!r||typeof r!=='object'||!id(r.id)||rids.has(r.id)||!ids.has(r.cat)||!T.includes(r.type)||!okD(r.date))return;const o={id:r.id,cat:r.cat,type:r.type,date:r.date};
if(r.type==='berat'){const v=Math.round(+r.val);if(!validWeight(v))return;o.val=v}else{o.name=str(r.name,100);if(r.note)o.note=str(r.note,500);if(r.clinic&&vids.has(r.clinic))o.clinic=r.clinic;const k=+r.cost;if(validCost(k)&&k>0)o.cost=Math.round(k*100)/100;if(validTime(r.time||''))o.time=r.time}
rids.add(r.id);recs.push(o)});
return{version:SCHEMA_VERSION,cats,recs,vets,bk:Number.isFinite(+d.bk)&&+d.bk>=0&&+d.bk<=Date.now()?+d.bk:0}}
const mAge=d=>{const a=new Date(d+'T00:00'),b=new Date(td()+'T00:00');let m=(b.getFullYear()-a.getFullYear())*12+b.getMonth()-a.getMonth();while(m>0&&addM(d,m)>td())m--;return m};
const addD=(d,n)=>iso(new Date(new Date(d+'T00:00').getTime()+n*864e5));
const addM=(d,n)=>{const a=new Date(d+'T00:00'),y=a.getFullYear(),m=a.getMonth()+n;return iso(new Date(y,m,Math.min(a.getDate(),new Date(y,m+1,0).getDate())))};
const dif=(a,b)=>Math.round((new Date(b+'T00:00')-new Date(a+'T00:00'))/864e5);
const isRab=r=>/rabies/i.test(r.name||'');
function plan(c){if(!okD(c.dob)||c.dob>td())return null;const T0=td(),now=d=>d<T0?T0:d,rs=t=>S.recs.filter(r=>r.cat===c.id&&r.type===t&&r.date<=T0).sort((a,b)=>a.date.localeCompare(b.date));
const V=rs('vaksin').filter(r=>!isRab(r)),vl=V[V.length-1],D=rs('cacing'),dl=D[D.length-1],R=rs('vaksin').filter(isRab),b6=addM(c.dob,6);let v,w;
if(!vl)v={d:now(addD(c.dob,56)),l:'Dos pertama'};
else if(dif(c.dob,vl.date)<112)v={d:addD(vl.date,28),l:'Dos berikutnya',last:vl.date};
else if(vl.date>=addD(b6,-14))v={d:addM(vl.date,36),l:'Booster 3 tahun',last:vl.date};
else v={d:addD(vl.date,28)>b6?addD(vl.date,28):b6,l:'Booster 6 bulan',last:vl.date};
if(!dl)w={d:now(addD(c.dob,21)),l:'Dos pertama'};
else{const a=dif(c.dob,dl.date),iv=a<56?14:a<dif(c.dob,b6)?30:90;w={d:addD(dl.date,iv),l:'Setiap '+iv+' hari',last:dl.date}}
const B=rs('berat'),bl=B[B.length-1];let t;if(!bl)t={d:T0,l:'Timbang pertama'};else{const a=dif(c.dob,bl.date),iv=a<56?1:a<dif(c.dob,b6)?7:30;t={d:addD(bl.date,iv),l:iv===1?'Setiap hari':iv===7?'Setiap minggu':'Setiap bulan',last:bl.date}}
return{t,v,w,rb:R[R.length-1],md:c.ms&&c.ms.md,mdd:addD(c.dob,154),rbd:addD(c.dob,84)}}
function sched(c){const p=plan(c);if(!p)return[];const T0=td(),L=d=>'±'+fd(d),tx=(x,t,k)=>{const n=dif(T0,x.d),ok=n>0&&!!x.last;return{k,t,ok,late:n<0,a:ok?(x.last===T0?'Selesai hari ini':'Terakhir '+fd(x.last)):n<0?'Lewat '+-n+' hari · '+L(x.d):n===0?'Hari ini':n===1?'Esok':'Seterusnya '+L(x.d),b:ok?'Seterusnya '+(n===1?'esok':L(x.d))+' · '+x.l:x.l+(x.last?' · terakhir '+fd(x.last):'')}};
return[tx(p.t,'Timbang berat','berat'),tx(p.w,'Ubat cacing','cacing'),tx(p.v,'Vaksin core (F3)','vaksin'),{k:'rabies',t:'Vaksin rabies',ok:!!p.rb,a:p.rb?'Selesai '+fd(p.rb.date):'Cadangan '+L(p.rbd),b:p.rb?'Booster ikut nasihat vet':'Umur ±12 minggu'},{k:'md',t:'Pemandulan',ok:!!p.md,a:p.md?'Selesai '+fd(p.md):'Cadangan '+L(p.mdd),b:p.md?'':'Umur ±5–6 bulan'}]}
const msT=c=>{if(!c.dob)return'';return `<h2>Jadual kesihatan</h2><div class="ms">${sched(c).map(x=>`<button class="mt${x.ok?' ok':''}${x.late?' lt':''}" data-action="tileGo" data-key="${x.k}"><i>${x.ok?'✓':''}</i><b>${x.t}</b><span>${x.a}</span><small>${x.b}</small></button>`).join('')}</div><details><summary class="mute">Peraturan jadual</summary><p class="mute">Vaksin core: dos pertama ±8 minggu, ulang setiap 4 minggu hingga umur 16 minggu atau lebih, booster pada 6 bulan, kemudian setiap 3 tahun.<br>Ubat cacing: bawah 8 minggu setiap 14 hari, hingga 6 bulan setiap 30 hari, selepas itu setiap 3 bulan.<br>Timbang berat: bawah 8 minggu setiap hari, hingga 6 bulan setiap minggu, selepas itu setiap bulan.</p></details><p class="mute">Tekan kotak untuk catat rawatan. Tarikh seterusnya dikira daripada tarikh lahir dan rekod terakhir. Panduan umum sahaja, sahkan dengan doktor haiwan.</p>`};
function tileGo(k){k==='md'?togMs('md'):k==='berat'?recForm('','berat'):k==='cacing'?recForm('','cacing'):recForm('','vaksin',k==='rabies'?'Rabies':'F3 (Tricat)')}
function togMs(k){const c=cat(cid);c.ms=c.ms||{};if(c.ms[k])delete c.ms[k];else c.ms[k]=td();save();render()}
function liveAge(){const f=document.querySelector('#sh form'),e=$('#ag');if(!f||!e)return;const d=f.dob.value;e.textContent=d&&age(d)?'Umur: '+(f.dobx.value==='Anggaran'?'±':'')+age(d):''}
function openCat(id,t){cid=id;tab=t||'berat';go('cat')}
const MOB=/iPhone|iPod|Android.*Mobile|Windows Phone/i.test(navigator.userAgent)||(matchMedia('(pointer:coarse)').matches&&Math.min(screen.width,screen.height)<600);
function render(){if(!MOB){$('#app').innerHTML=`<div class="gate">${ART()}<h1>Kucingku untuk telefon sahaja</h1><p class="mute">Buka pautan ini di telefon bimbit anda (iPhone atau Android) untuk menggunakan app ini.</p></div>`;$('#nav').innerHTML='';return}
$('#app').innerHTML=view==='home'?home():view==='cats'?cats():view==='cat'?catv():view==='jd'?jdv():view==='more'?morev():view==='vet'?vetv():bkv();
if(storageReadError)$('#app').insertAdjacentHTML('afterbegin',`<div class="card"><b>Data storan tidak dapat dibaca</b><p class="mute">Data asal belum diubah. Buka Backup untuk export salinan asal atau import backup yang sah.</p><button class="btn g" data-action="go" data-view="bk">Buka Backup</button></div>`);
$('#nav').innerHTML=[['home','Utama'],['cats','Kucing'],['jd','Jadual'],['more','Lagi']].map(([k,l])=>`<button class="${view===k||(view==='cat'&&k==='cats')||(k==='more'&&(view==='vet'||view==='bk'))?'on':''}" data-action="go" data-view="${k}"><svg viewBox="0 0 24 24" aria-hidden="true">${I[k]}</svg>${l}</button>`).join('')}
const ART=()=>`<svg class="art" viewBox="0 0 120 110" aria-hidden="true"><path d="M22 52 18 14 46 32ZM98 52 102 14 74 32Z" fill="#F7C6D0"/><path d="M26 46 24 24 40 34ZM94 46 96 24 80 34Z" fill="#FBE1E7"/><ellipse cx="60" cy="68" rx="46" ry="38" fill="#FFF6EC"/><ellipse cx="38" cy="50" rx="13" ry="9" fill="#F5C9A5" opacity=".8"/><circle cx="43" cy="66" r="5" fill="#5A4558"/><circle cx="77" cy="66" r="5" fill="#5A4558"/><circle cx="45" cy="64" r="1.6" fill="#fff"/><circle cx="79" cy="64" r="1.6" fill="#fff"/><ellipse cx="32" cy="78" rx="8" ry="5" fill="#F9B8C6" opacity=".7"/><ellipse cx="88" cy="78" rx="8" ry="5" fill="#F9B8C6" opacity=".7"/><path d="M55 76q5 5 10 0" stroke="#5A4558" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M60 72l-3-2h6z" fill="#E98AA0"/><path d="M12 72 28 74M12 82 28 80M108 72 92 74M108 82 92 80" stroke="#D9C6D0" stroke-width="2" stroke-linecap="round"/></svg>`;
const ZZ=`<svg viewBox="0 0 110 80" aria-hidden="true"><ellipse cx="55" cy="58" rx="42" ry="18" fill="#FFF1E3"/><circle cx="34" cy="48" r="17" fill="#FFF1E3"/><path d="M22 36 20 24 32 31ZM46 34 50 22 38 30Z" fill="#F7C6D0"/><path d="M27 49q3 3 6 0M37 49q3 3 6 0" stroke="#5A4558" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="25" cy="55" rx="4" ry="2.5" fill="#F9B8C6"/><path d="M92 54q14-2 12-16" stroke="#F5C9A5" stroke-width="7" fill="none" stroke-linecap="round"/><text x="62" y="28" font-size="14" fill="#B79CCB">z z</text></svg>`;
function home(){const n=S.cats.length,k=tasks(),late=k.filter(x=>x.d<0).length;
let h=`<div class="top2"><b>Kucingku</b><span>${new Date().toLocaleDateString('ms-MY',{weekday:'long',day:'numeric',month:'short'})}</span></div>`;
h+=n?`<div class="hero">${ART()}<h1>${S.cats.map(c=>esc(c.name)).join(', ')}</h1><p>${n} ekor kucing dalam jagaan</p></div>`:`<div class="hero">${ART()}<h1>Selamat datang!</h1><p>Tambah kucing pertama anda untuk mula merekod.</p><button class="btn" data-action="catForm">Tambah kucing</button></div>`;
if(!n)return h;
h+=`<div class="rail">${S.cats.map(c=>`<button data-action="openCat" data-id="${c.id}">${av(c)}${esc(c.name)}</button>`).join('')}<button data-action="catForm"><span class="av" style="display:grid;place-items:center;background:var(--soft);color:var(--btn);font-size:30px;font-weight:700">+</span>Tambah</button></div><button class="qw" data-action="quickW"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="4"/><path d="M9 11a3 3 0 0 1 6 0M12 11l1.5-2"/></svg><span>Timbang cepat<small>Catat berat semua kucing sekali gus</small></span></button>`;
h+=`<div class="st"><div><svg viewBox="0 0 24 24">${I.cats}</svg><b>${n}</b><span>Kucing</span></div><div><svg viewBox="0 0 24 24"><path d="M6 17h12l-1.5-2V11a4.5 4.5 0 0 0-9 0v4zM10 20h4"/></svg><b>${k.length}</b><span>Akan datang</span></div><div><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg><b>${late}</b><span>Lewat</span></div></div>`;
if(!S.bk||Date.now()-S.bk>2592e6)h+=`<div class="card" style="margin-top:12px"><b>Buat backup data</b><p class="mute">Data hanya ada di telefon ini. Buat backup supaya tidak hilang.</p><button class="btn g" data-action="go" data-view="bk">Buka Backup</button></div>`;
h+=`<h2>Akan datang</h2>`+(k.length?k.map(trow).join(''):`<div class="ok">${ZZ}<p class="mute">Semua beres! Tiada tugasan dalam 30 hari akan datang.</p></div>`);
return h}
function cats(){const k=tasks();
let h=`<div class="kh"><h2>Kucing anda</h2><button class="btn" style="margin:0;padding:10px 18px" data-action="catForm">+ Tambah</button></div>`;
if(!S.cats.length)return h+`<div class="ok">${ZZ}<p class="mute">Belum ada kucing. Tambah kucing pertama anda untuk mula merekod.</p></div>`;
return h+S.cats.map(c=>{const w=lastW(c.id),j=c.sex==='Jantan',nt=(m=>m.find(x=>x.d<0)||m.find(x=>x.t!=='berat')||m[0])(k.filter(x=>x.c.id===c.id)),st=stN(c);
return `<button class="kc${j?' j':''}" data-action="openCat" data-id="${c.id}"><div class="kt">${av(c)}<div><div class="kn">${esc(c.name)}</div><div class="chips">${c.sex?`<span class="chip">${j?'♂ ':c.sex==='Betina'?'♀ ':''}${esc(c.sex)}</span>`:''}${st?`<span class="chip">${st}</span>`:''}</div><span class="mute">${ageT(c)||'Tarikh lahir belum diisi'}</span></div></div><div class="ks"><div><small>Berat</small><b>${w?fw(w.val):'-'}</b></div><div><small>Rekod</small><b>${S.recs.filter(r=>r.cat===c.id).length}</b></div><div><small>${nt?(nt.t==='vaksin'?'Vaksin':nt.t==='cacing'?'Ubat cacing':nt.t==='lawatan'?'Temujanji':'Timbang'):'Akan datang'}</small><b>${nt?(nt.d<0?'Lewat':nt.d===0?'Hari ini':nt.d===1?'Esok':nt.d+' hari'):'-'}</b></div></div></button>`}).join('')}
function chart(a,c){if(a.length<2)return '<p class="mute">Tambah sekurang-kurangnya 2 timbangan untuk lihat graf pertumbuhan.</p>';
const W=320,H=150,p=22,t=a.map(x=>+new Date(x.date)),v=a.map(x=>+x.val),t0=Math.min(...t),t1=Math.max(...t),lo=Math.min(...v)*.9,hi=Math.max(...v)*1.05;
const X=i=>(p+(t1==t0?0:(t[i]-t0)/(t1-t0))*(W-2*p)).toFixed(1),Y=i=>(H-p-(v[i]-lo)/((hi-lo)||1)*(H-2*p)).toFixed(1),P=a.map((_,i)=>X(i)+','+Y(i)).join(' ');
return `<svg class="ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="Graf berat"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".4"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs><polygon points="${p},${H-p} ${P} ${X(a.length-1)},${H-p}" fill="url(#g)"/><polyline points="${P}" fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${a.map((_,i)=>`<circle cx="${X(i)}" cy="${Y(i)}" r="4.5" fill="var(--card)" stroke="${c}" stroke-width="2.5"/>`).join('')}</svg>`}
function catv(){const c=cat(cid);if(!c){view='home';return home()}
const l=S.recs.filter(r=>r.cat===c.id&&r.type===tab).sort((a,b)=>b.date.localeCompare(a.date));
let b='';
if(tab==='berat'){const a=l.slice().reverse(),d=a.length>1?a[a.length-1].val-a[a.length-2].val:null;
b=l.length?`<div class="card"><div class="big">${fw(l[0].val)}</div><p class="mute">${d===null?'Timbangan pertama':(d<0?'-':'+')+fw(Math.abs(d))+' sejak timbangan sebelum ini'}</p>${chart(a,GP(c).ln)}</div>`:'';}
b+=l.length?l.map(r=>`<div class="row"><span><b>${tab==='berat'?fw(r.val):esc(r.name)}${tab==='lawatan'&&r.date>td()?' <span class="pill">Temujanji</span>':''}</b><span class="mute">${fd(r.date)}${r.time?' · '+r.time:''}${vn(r)}${r.cost?' · RM '+r.cost.toFixed(2):''}${r.note?'<br>'+esc(r.note):''}</span></span><span class="rb"><button class="x" data-action="recForm" data-id="${r.id}">Edit</button><button class="x" data-action="delRec" data-id="${r.id}">Padam</button></span></div>`).join(''):`<p class="mute">Belum ada rekod ${T[tab].toLowerCase()}.</p>`;
return `<div class="${c.sex==='Jantan'?'th-j':''}"><button class="bk" data-action="go" data-view="cats">‹ Kucing</button>${pcard(c)}${msT(c)}${lsT(c)}<div class="tabs" role="tablist">${Object.keys(T).map(k=>`<button class="${k===tab?'on':''}" data-action="tab" data-tab="${k}">${T[k]}</button>`).join('')}</div>${b}<button class="btn" data-action="recForm">Tambah rekod ${T[tab].toLowerCase()}</button></div>`}
function sheet(h){$('#sh').innerHTML=`<div class="sb">${h}</div>`;$('#sh').hidden=false}
let _ask;
function ask(m,ok,fn){_ask=fn;sheet(`<h2>${m}</h2><div class="acts"><button class="btn" data-action="confirm">${ok}</button><button class="btn g" data-action="closeSh">Batal</button></div>`)}
function closeSh(){$('#sh').hidden=true}
const L=(t,i)=>`<label>${t}${i}</label>`;
const wIn=(n,g,ph)=>{const kg=g>=1000;return `<div class="wi"><input name="${n}" type="number" inputmode="decimal" step="any" min="0" placeholder="${ph||''}" value="${g?(kg?+(g/1000).toFixed(3):g):''}"><select name="${n}_u"><option value="g"${kg?'':' selected'}>g</option><option value="kg"${kg?' selected':''}>kg</option></select></div>`};
const wG=(o,n)=>{const v=Number(o[n]),g=Math.round(o[n+'_u']==='kg'?v*1000:v);return validWeight(g)?g:0};
function recError(o,t){
if(!okD(o.date))return 'Masukkan tarikh yang sah';
if(t!=='lawatan'&&o.date>td())return 'Rawatan dan timbangan mesti bertarikh hari ini atau sebelumnya. Guna Lawatan vet untuk temujanji.';
if(t==='berat'&&!validWeight(o.val))return 'Berat mesti antara 1 g hingga 30 kg';
if(t!=='berat'&&!(o.name||'').trim())return 'Masukkan nama atau sebab rekod';
if(o.cost!==undefined&&o.cost!==''&&!validCost(Number(o.cost)))return 'Kos mesti antara RM 0 hingga RM 1,000,000';
if(o.time&&!validTime(o.time))return 'Masukkan masa yang sah';
return '';
}
function recForm(id,t0,nm){const r=id?S.recs.find(x=>x.id===id):{},t=r.type||t0||tab,v=k=>esc(r[k])||esc(nm||'');
let f=L('Tarikh',`<input name="date" type="date" value="${r.date||td()}"${t==='lawatan'?'':` max="${td()}"`} required>`);
if(t==='berat')f+=L('Berat',wIn('val',+r.val||0));
if(t==='vaksin')f+=L('Jenis vaksin',`<input name="name" list="vk" required placeholder="cth. F3 (Tricat)" value="${v('name')}"><datalist id="vk"><option value="F3 (Tricat)"><option value="F4"><option value="Rabies"></datalist>`)+L('Catatan',`<input name="note" value="${v('note')}">`);
if(t==='cacing')f+=L('Nama produk',`<input name="name" required value="${v('name')}">`)+L('Dos / catatan',`<input name="note" value="${v('note')}">`);
if(t==='sihat')f+=L('Tajuk',`<input name="name" required placeholder="cth. Lawatan vet, selesema" value="${v('name')}">`)+L('Butiran',`<textarea name="note" rows="3">${v('note')}</textarea>`);
if(t==='lawatan')f+='<p class="mute" style="margin:-4px 0 12px">Tarikh akan datang dipaparkan sebagai temujanji.</p>'+L('Masa (pilihan)',`<input name="time" type="time" value="${v('time')}">`)+L('Sebab lawatan',`<input name="name" required placeholder="cth. Pemeriksaan, vaksin, sakit" value="${v('name')}">`)+L('Diagnosis / catatan',`<textarea name="note" rows="3">${v('note')}</textarea>`);
if(t!=='berat')f+=clinicSel(r)+costIn(r);
sheet(`<h2>${id?'Edit ':''}${T[t]}</h2><form data-submit="rec" data-id="${id||''}" data-type="${t}">${f}<button class="btn">${id?'Simpan perubahan':'Simpan rekod'}</button></form>`)}
function saveRec(e,id,t){e.preventDefault();t=t||tab;const o=Object.fromEntries(new FormData(e.target));if(t==='berat'){o.val=wG(o,'val');delete o.val_u}const error=recError(o,t);if(error){toast(error);return}if(o.cost!==undefined){const k=Number(o.cost);if(k>0)o.cost=Math.round(k*100)/100;else delete o.cost}if(!o.clinic)delete o.clinic;if(!o.time)delete o.time;if(id){const r=S.recs.find(x=>x.id===id);['name','next','note','val','clinic','cost','time'].forEach(k=>delete r[k]);Object.assign(r,o)}else S.recs.push({id:uid(),cat:cid,type:t,...o});if(!save())return;closeSh();render();toast(id?'Rekod dikemas kini':'Rekod disimpan')}
function quickW(){sheet(`<h2>Timbang cepat</h2><form data-submit="quickW">${L('Tarikh',`<input name="date" type="date" max="${td()}" value="${td()}" required>`)}${S.cats.map(c=>{const w=lastW(c.id);return `<div class="qr">${av(c)}<label>${esc(c.name)}${wIn('w_'+c.id,0,w?'lepas: '+fw(w.val):'berat')}</label></div>`}).join('')}<button class="btn">Simpan berat</button></form>`)}
function saveQW(e){
e.preventDefault();const o=Object.fromEntries(new FormData(e.target)),pending=[];
if(!okD(o.date)||o.date>td()){toast('Masukkan tarikh hari ini atau sebelumnya');return}
for(const c of S.cats){const key='w_'+c.id;if(!String(o[key]||'').trim())continue;
const val=wG(o,key);if(!val){toast('Berat '+c.name+' mesti antara 1 g hingga 30 kg');return}
pending.push({id:uid(),cat:c.id,type:'berat',date:o.date,val});}
if(!pending.length){toast('Masukkan sekurang-kurangnya satu berat');return}
S.recs.push(...pending);if(!save())return;closeSh();render();toast(pending.length+' rekod berat disimpan');
}
const PDF_LIBS=[
{url:'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',integrity:'sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H'},
{url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/jspdf.umd.min.js',integrity:'sha384-qovJwSBbRDPP5cEjCp8S0UP66wrvnjaa60XMOGzTNanrThcrGfXfnZkvgY8N1KT3'}
];
const scriptLoads=new Map();
function loadJs(u,integrity){
if(scriptLoads.has(u))return scriptLoads.get(u);
const e=document.createElement('script');e.src=u;e.integrity=integrity;e.crossOrigin='anonymous';
let timer;const promise=new Promise((ok,no)=>{
e.onload=()=>{clearTimeout(timer);ok()};
e.onerror=()=>{clearTimeout(timer);scriptLoads.delete(u);e.remove();no(new Error('Gagal memuat pustaka PDF'))};
timer=setTimeout(e.onerror,20000);
});scriptLoads.set(u,promise);document.head.appendChild(e);return promise;
}
function rpt(c){const g=GP(c),j=c.sex==='Jantan',R=t=>S.recs.filter(r=>r.cat===c.id&&r.type===t).sort((a,b)=>b.date.localeCompare(a.date)),st=stN(c),mv=S.vets.find(v=>v.main);
const vnm=r=>{const v=S.vets.find(x=>x.id===r.clinic);return v?esc(v.name):'-'};
const tb=(l,cols)=>l.length?`<table class="rt"><tr>${cols.map(x=>`<th>${x[0]}</th>`).join('')}</tr>${l.map(r=>`<tr>${cols.map(x=>`<td>${x[1](r)}</td>`).join('')}</tr>`).join('')}</table>`:'<p class="rm">Tiada rekod.</p>';
const vc=[['Tarikh',r=>fd(r.date)],['Nama',r=>esc(r.name)],['Klinik',vnm],['Kos (RM)',r=>r.cost?r.cost.toFixed(2):'-'],['Catatan',r=>esc(r.note)||'-']];
const w=R('berat'),info=[['Tarikh lahir',c.dob?fd(c.dob)+(c.dobx==='Anggaran'?' (anggaran)':''):''],['Umur',ageT(c)],['Fasa',st],['Baka',c.breed],['Warna / corak',c.pattern],['No. microchip',c.chip],['Catatan',c.note]].filter(x=>x[1]);
const ch=w.length>1?chart(w.slice().reverse(),g.ln).replace('id="g"','id="gr"').replace('url(#g)','url(#gr)'):'<p class="rm">Perlu sekurang-kurangnya 2 rekod berat untuk graf.</p>';
return `<div class="rp${j?' j':''}"><div class="rh">${av(c)}<div><div class="rbr">Kucingku · Rekod Kesihatan</div><div class="rn">${esc(c.name)}</div><div class="rc">${c.sex?`<span>${j?'♂ ':c.sex==='Betina'?'♀ ':''}${esc(c.sex)}</span>`:''}${st?`<span>${st}</span>`:''}${c.dob?`<span>${ageT(c)}</span>`:''}</div>${mv?`<div class="rv">Klinik utama: ${esc(mv.name)}${mv.tel?' · '+esc(mv.tel):''}</div>`:''}</div></div><div class="rbd">${info.length?`<h4>Profil</h4><div class="ri">${info.map(x=>`<div><span>${x[0]}</span><b>${esc(x[1])}</b></div>`).join('')}</div>`:''}${c.dob?`<h4>Jadual kesihatan</h4><div class="rg">${sched(c).filter(x=>x.k!=='berat').map(x=>`<div class="${x.ok?'rd':''}"><b>${x.ok?'✓ ':''}${x.t}</b>${x.a}<br>${x.b}</div>`).join('')}</div>`:''}<h4>Vaksin</h4>${tb(R('vaksin'),vc)}<h4>Ubat cacing / kutu</h4>${tb(R('cacing'),vc)}<h4>Berat</h4><div class="rw"><div>${ch}</div>${tb(w,[['Tarikh',r=>fd(r.date)],['Berat',r=>fw(r.val)]])}</div>${R('sihat').length?`<h4>Catatan kesihatan</h4>${tb(R('sihat'),[['Tarikh',r=>fd(r.date)],['Tajuk',r=>esc(r.name)],['Butiran',r=>esc(r.note)||'-']])}`:''}${R('lawatan').length?`<h4>Lawatan vet</h4>${tb(R('lawatan'),[['Tarikh / masa',r=>fd(r.date)+(r.time?' · '+esc(r.time):'')],['Sebab',r=>esc(r.name)],['Klinik',vnm],['Kos (RM)',r=>r.cost?r.cost.toFixed(2):'-'],['Catatan',r=>esc(r.note)||'-']])}`:''}</div><div class="rf">Dijana oleh Kucingku pada ${fd(td())}. Panduan sahaja dan bukan pengganti nasihat doktor haiwan.</div></div>`}
function pdfPageRanges(height,pageHeight,blocks){
const pages=[];
for(let start=0;start<height;){
let end=Math.min(start+pageHeight,height);
if(end<height){const crossing=blocks.filter(b=>b.top>start&&b.top<end&&b.bottom>end&&b.bottom-b.top<=pageHeight);if(crossing.length)end=Math.min(...crossing.map(b=>b.top))}
pages.push({start,height:end-start});start=end;
}
return pages;
}
let pdfBusy=false;
async function pdfCat(id){if(pdfBusy)return;pdfBusy=true;const c=cat(id);let box;toast('Menyediakan PDF...');
try{const dl=await getDl();if(!dl){toast('Export PDF tidak tersedia di sini');return}
await Promise.all(PDF_LIBS.map(x=>loadJs(x.url,x.integrity)));
if(typeof html2canvas!=='function'||!window.jspdf||!window.jspdf.jsPDF)throw new Error('Pustaka PDF belum tersedia');
box=document.createElement('div');box.id='rpb';box.innerHTML=rpt(c);document.body.appendChild(box);
if(document.fonts)await document.fonts.ready;
const report=box.firstChild,bounds=report.getBoundingClientRect(),width=794,pw=210,pageHeight=Math.floor(width*297/pw);
const blocks=Array.from(report.querySelectorAll('.rh,.ri>div,.rg,.rt tr,.rf,h4')).map(el=>{const r=el.getBoundingClientRect();let bottom=r.bottom;if(el.tagName==='H4'&&el.nextElementSibling){const next=el.nextElementSibling,first=next.querySelector('tr');bottom=(first||next).getBoundingClientRect().bottom}return{top:Math.floor(r.top-bounds.top),bottom:Math.ceil(bottom-bounds.top)}});
const pages=pdfPageRanges(Math.ceil(bounds.height),pageHeight,blocks),pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4'});
// Capture one page at a time so a long history cannot exceed canvas height limits.
for(let p=0;p<pages.length;p++){
const part=pages[p],cv=await html2canvas(report,{scale:2,backgroundColor:'#FFFDFD',windowWidth:794,width,height:part.height,y:bounds.top+part.start,scrollX:0,scrollY:0});
if(p)pdf.addPage();pdf.addImage(cv.toDataURL('image/jpeg',.92),'JPEG',0,0,pw,part.height*pw/width);
}
await dl.save({filename:'kucingku-'+(c.name||'kucing').replace(/[^\w-]+/g,'-')+'-'+td()+'.pdf',data:pdf.output('blob')});toast('PDF disimpan')}
catch(e){if(!(e&&e.code==='declined'))toast('Export PDF gagal. Cuba lagi.')}finally{if(box)box.remove();pdfBusy=false}}
function delRec(id){ask('Padam rekod ini?','Padam',()=>{S.recs=S.recs.filter(r=>r.id!==id);if(!save()){render();return}render();toast('Rekod dipadam')})}
const BR=[['Tanpa baka',['Domestic Shorthair','Domestic Mediumhair','Domestic Longhair','Campuran (Mix breed)']],['Baka popular',['Persian','Exotic Shorthair','British Shorthair','Scottish Fold','Maine Coon','Ragdoll','Siamese','Bengal','Himalayan','Sphynx','American Shorthair','Abyssinian']]];
const brOther=c=>!!c.breed&&c.breed!=='Tidak pasti'&&!BR.some(g=>g[1].includes(c.breed));
function brSel(){const f=document.querySelector('#sh form');$('#bx').hidden=f.brs.value!=='__x'}
function catForm(id){const c=id?cat(id):{color:COL[S.cats.length%6]};PH=undefined;
sheet(`<h2>${id?'Edit profil':'Tambah kucing'}</h2><form data-submit="cat" data-id="${id||''}">${L('Nama',`<input name="name" required value="${esc(c.name)}">`)}${L('Jantina',`<select name="sex">${['Jantan','Betina','Belum pasti'].map(s=>`<option${c.sex===s?' selected':''}>${s}</option>`).join('')}</select>`)}${L('Tarikh lahir',`<input name="dob" type="date" max="${td()}" value="${c.dob||''}" data-input="liveAge">`)}${L('Ketepatan tarikh lahir',`<select name="dobx" data-change="liveAge">${['Tepat','Anggaran'].map(s=>`<option${c.dobx===s?' selected':''}>${s}</option>`).join('')}</select>`)}<div class="age" id="ag"></div>${L('Baka',`<select name="brs" data-change="brSel"><option value="">Pilih baka</option>${BR.map(([g,l])=>`<optgroup label="${g}">${l.map(b=>`<option${c.breed===b?' selected':''}>${b}</option>`).join('')}</optgroup>`).join('')}<option value="__x"${brOther(c)?' selected':''}>Lain-lain</option><option${c.breed==='Tidak pasti'?' selected':''}>Tidak pasti</option></select>`)}<label id="bx"${brOther(c)?'':' hidden'}>Nama baka<input name="brx" value="${esc(brOther(c)?c.breed:'')}"></label>${L('Warna / corak',`<input name="pattern" value="${esc(c.pattern)}" placeholder="cth. Putih &amp; calico, gebu">`)}${L('Gambar','<input type="file" accept="image/*" data-change="pic">')}${L('No. microchip (jika ada)',`<input name="chip" value="${esc(c.chip)}">`)}${L('Catatan',`<input name="note" value="${esc(c.note)}">`)}<button class="btn">Simpan</button>${id?`<button type="button" class="btn r" data-action="delCat" data-id="${id}">Padam kucing ini</button>`:''}</form>`);liveAge()}
function pic(i){const f=i.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const m=new Image();m.onload=()=>{const s=Math.min(1,400/Math.max(m.width,m.height)),c=document.createElement('canvas');c.width=m.width*s;c.height=m.height*s;c.getContext('2d').drawImage(m,0,0,c.width,c.height);PH=c.toDataURL('image/jpeg',.72);toast('Gambar sedia disimpan')};m.src=r.result};r.readAsDataURL(f)}
function saveCat(e,id){e.preventDefault();const o=Object.fromEntries(new FormData(e.target));if(!(o.name||'').trim()){toast('Masukkan nama kucing');return}if(o.dob&&(!okD(o.dob)||o.dob>td())){toast('Masukkan tarikh lahir yang sah, hari ini atau sebelumnya');return}delete o.undefined;o.breed=o.brs==='__x'?(o.brx||'').trim():(o.brs||'');delete o.brs;delete o.brx;
if(id){const c=cat(id);Object.assign(c,o);if(PH)c.photo=PH}else{const c={id:uid(),color:COL[S.cats.length%6],...o};if(PH)c.photo=PH;S.cats.push(c)}
if(!save())return;closeSh();render();toast('Profil disimpan')}
function delCat(id){ask('Padam kucing ini beserta semua rekodnya?','Padam',()=>{S.cats=S.cats.filter(c=>c.id!==id);S.recs=S.recs.filter(r=>r.cat!==id);if(!save()){render();return}go('cats');toast('Kucing dipadam')})}
function bkv(){const old=!S.bk||Date.now()-S.bk>2592e6;
return `<button class="bk" data-action="go" data-view="more">‹ Lagi</button><h2 style="margin-top:12px">Backup</h2><p class="mute">Data Kucingku disimpan di telefon ini sahaja. Buat backup berkala supaya data tidak hilang jika data pelayar dibersihkan.</p><div class="card bs" style="margin-top:14px"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg><div><b>${S.bk?'Backup terakhir':'Belum ada backup'}</b><span class="mute">${S.bk?fd(iso(new Date(S.bk))):'Tekan Export untuk mula.'}</span></div><span class="pill${old?' bad':''}">${old?'Perlu backup':'Selamat'}</span></div><div class="card"><b>Export</b><p class="mute">Simpan fail backup (.json) ke telefon ini.</p><div class="acts"><button class="btn" data-action="exportBk">Export fail</button><button class="btn g" data-action="copyBk">Copy</button></div><p class="mute" style="margin-top:8px">Copy akan menyalin teks backup ke clipboard.</p></div><div class="card"><b>Import</b><p class="mute">Pilih fail backup (.json). Data semasa akan diganti.</p><label class="btn fl">Pilih fail<input type="file" accept=".json,application/json" data-change="impFile" hidden></label><details><summary class="mute">Atau tampal teks backup</summary><textarea id="imp" rows="4" placeholder="Tampal teks backup di sini"></textarea><button class="btn g" data-action="impBk">Import teks</button></details></div>`}
async function getDl(){try{if(typeof claude!=='undefined'&&claude.use){const d=await claude.use('downloads');if(d)return d}}catch(e){}
return{save:async({filename,data})=>{const b=data instanceof Blob?data:new Blob([data],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}}}
async function exportBk(){try{const dl=await getDl();if(storageReadError){await dl.save({filename:'kucingku-storan-asal-'+td()+'.txt',data:rawStorage});toast('Muat turun salinan asal dimulakan');return}if(!dl){toast('Export tidak tersedia di sini. Guna Copy.');return}
await dl.save({filename:'kucingku-backup-'+td()+'.json',data:JSON.stringify({...S,bk:Date.now()})});S.bk=Date.now();if(!save())return;render();toast('Muat turun backup dimulakan')}catch(e){if(e&&e.code==='declined')return;toast('Export gagal. Cuba Copy.')}}
function copyBk(){const j=storageReadError?rawStorage:JSON.stringify({...S,bk:Date.now()});(navigator.clipboard?navigator.clipboard.writeText(j):Promise.reject()).then(()=>{if(storageReadError){toast('Salinan asal disalin ke clipboard');return}S.bk=Date.now();if(!save())return;toast('Backup disalin ke clipboard');render()}).catch(()=>toast('Gagal copy. Cuba Export.'))}
function impBk(){impTxt($('#imp').value)}
function impFile(i){const f=i.files[0];if(!f)return;if(f.size>MAX_IMPORT_BYTES){toast('Fail backup terlalu besar (maksimum 10 MB)');i.value='';return}const r=new FileReader();r.onload=()=>impTxt(r.result);r.onerror=()=>toast('Fail backup tidak dapat dibaca');r.readAsText(f);i.value=''}
function parseBackup(t){
if(typeof t!=='string'||new Blob([t]).size>MAX_IMPORT_BYTES)throw new Error('Backup terlalu besar (maksimum 10 MB)');
const d=JSON.parse(t);
if(!d||!Array.isArray(d.cats)||!Array.isArray(d.recs)||(d.vets!==undefined&&!Array.isArray(d.vets)))throw new Error('Format backup tidak sah');
if(d.version!==undefined&&(!Number.isInteger(d.version)||d.version<1||d.version>SCHEMA_VERSION))throw new Error('Versi backup tidak disokong');
const n=clean(d);
if(n.cats.length!==d.cats.length||n.recs.length!==d.recs.length||n.vets.length!==(d.vets||[]).length)throw new Error('Backup mengandungi ID berulang, rujukan hilang atau rekod tidak sah');
for(const c of d.cats){
if(c.dob&&(!okD(c.dob)||c.dob>td()))throw new Error('Tarikh lahir dalam backup tidak sah');
if(c.photo&&!validPhoto(c.photo))throw new Error('Gambar dalam backup tidak sah');
if(c.ms&&c.ms.md&&!okD(c.ms.md))throw new Error('Tarikh pemandulan dalam backup tidak sah');
for(const key of ['name','sex','breed','pattern','chip','note'])if(c[key]!==undefined&&typeof c[key]!=='string')throw new Error('Profil dalam backup tidak sah');
}
for(const v of d.vets||[])for(const key of ['name','tel','addr','hours','doc','note'])if(v[key]!==undefined&&typeof v[key]!=='string')throw new Error('Klinik dalam backup tidak sah');
for(const r of d.recs){
if(r.type==='berat'&&!validWeight(Number(r.val)))throw new Error('Berat dalam backup tidak sah');
if(r.cost!==undefined&&!validCost(Number(r.cost)))throw new Error('Kos dalam backup tidak sah');
if(r.time&&!validTime(r.time))throw new Error('Masa dalam backup tidak sah');
if(r.clinic&&!n.vets.some(v=>v.id===r.clinic))throw new Error('Rujukan klinik dalam backup tidak sah');
for(const key of ['name','note'])if(r[key]!==undefined&&typeof r[key]!=='string')throw new Error('Teks rekod dalam backup tidak sah');
}
return n;
}
function impTxt(t){try{const n=parseBackup(t);ask('Import '+n.cats.length+' kucing, '+n.recs.length+' rekod dan '+n.vets.length+' klinik? Semua data semasa akan diganti.','Import',()=>{S=n;if(!save(true)){render();return}go('home');toast('Import berjaya')})}catch(e){toast(e instanceof SyntaxError?'Teks backup bukan JSON yang sah':e.message||'Teks backup tidak sah')}}
try{rawStorage=localStorage.getItem(K)||'';if(rawStorage)S=parseBackup(rawStorage)}catch(e){storageReadError=true}
persistedState=JSON.stringify(S);
render();

// Delegated handlers support re-rendered views without inline JavaScript or eval.
const clickActions={
go:el=>go(el.dataset.view),openCat:el=>openCat(el.dataset.id),
task:el=>{openCat(el.dataset.id,el.dataset.type);if(el.dataset.type==='berat')recForm()},
vetForm:el=>vetForm(el.dataset.id),catForm:el=>catForm(el.dataset.id),
recForm:el=>recForm(el.dataset.id),pdfCat:el=>pdfCat(el.dataset.id),
delVet:el=>delVet(el.dataset.id),delCat:el=>delCat(el.dataset.id),delRec:el=>delRec(el.dataset.id),
tileGo:el=>tileGo(el.dataset.key),tab:el=>{tab=el.dataset.tab;render()},
quickW:()=>quickW(),exportBk:()=>exportBk(),copyBk:()=>copyBk(),impBk:()=>impBk(),
confirm:()=>{closeSh();if(_ask)_ask()},closeSh:()=>closeSh()
};
document.addEventListener('click',event=>{
if(event.target.id==='sh'){closeSh();return}
const el=event.target.closest('[data-action]');
if(el&&Object.hasOwn(clickActions,el.dataset.action)){event.preventDefault();clickActions[el.dataset.action](el)}
});
const formActions={cat:(e,f)=>saveCat(e,f.dataset.id),vet:(e,f)=>saveVet(e,f.dataset.id),rec:(e,f)=>saveRec(e,f.dataset.id,f.dataset.type),quickW:e=>saveQW(e)};
document.addEventListener('submit',event=>{
const form=event.target;if(Object.hasOwn(formActions,form.dataset.submit)){event.preventDefault();formActions[form.dataset.submit](event,form)}
});
document.addEventListener('input',event=>{if(event.target.dataset.input==='liveAge')liveAge()});
const changeActions={liveAge:()=>liveAge(),brSel:()=>brSel(),pic:el=>pic(el),impFile:el=>impFile(el)};
document.addEventListener('change',event=>{
const el=event.target;if(Object.hasOwn(changeActions,el.dataset.change))changeActions[el.dataset.change](el)
});
