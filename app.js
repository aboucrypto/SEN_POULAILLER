/* SADIKH SERVICES — PWA hors connexion + synchronisation Supabase.
   Les saisies sont d'abord stockées localement. Synchronisation cloud après connexion.
*/
const DBKEY='sadikh_records_v1', CFGKEY='sadikh_supabase_cfg_v1';
const $=s=>document.querySelector(s);
const today=()=>new Date().toISOString().slice(0,10);
const modules={
 lots:{title:'Gestion des lots',fields:[['code','Code du lot','text',true],['date','Date d’arrivée','date',true],['breed','Souche','text'],['initial','Effectif initial','number'],['chickPrice','Prix poussin (FCFA)','number']]},
 sales:{title:'Enregistrer une vente',fields:[['date','Date','date',true],['lot','Code lot','text',true],['qty','Quantité vendue','number',true],['price','Prix unitaire (FCFA)','number',true],['customer','Client','text'],['phone','Téléphone','tel'],['payment','Paiement','select',false,['Espèces','Wave','Orange Money','Virement','Crédit','Autre']]]},
 expenses:{title:'Enregistrer une dépense',fields:[['date','Date','date',true],['lot','Code lot','text'],['category','Catégorie','select',false,['Aliment','Médicament','Transport','Main-d’œuvre','Eau/électricité','Entretien','Autre']],['description','Description','text',true],['amount','Montant (FCFA)','number',true]]},
 deaths:{title:'Enregistrer une mortalité',fields:[['date','Date','date',true],['lot','Code lot','text',true],['qty','Nombre mort','number',true],['cause','Cause / observation','text']]},
 vaccines:{title:'Suivi des vaccinations',fields:[['date','Date vaccination','date',true],['lot','Code lot','text',true],['age','Âge (jours)','number'],['vaccine','Vaccin / médicament','text',true],['target','Maladie ciblée','text'],['dose','Dose','text'],['route','Voie','select',false,['Eau de boisson','Oculaire','Nasale','Injection','Autre']],['treated','Effectif traité','number'],['nextDate','Prochaine date','date']]},
 stock:{title:'Gestion du stock',fields:[['date','Date','date',true],['product','Produit / article','text',true],['kind','Mouvement','select',false,['Entrée','Sortie']],['qty','Quantité','number',true],['unit','Unité','text'],['threshold','Seuil alerte','number']]},
 customers:{title:'Fichier clients',fields:[['name','Nom client','text',true],['phone','Téléphone','tel'],['address','Adresse / quartier','text'],['kind','Type client','text']]}
};
let current='lots';
function read(){try{return JSON.parse(localStorage.getItem(DBKEY)||'[]')}catch{return []}}
function write(a){localStorage.setItem(DBKEY,JSON.stringify(a));refreshStats()}
function cfg(){try{return JSON.parse(localStorage.getItem(CFGKEY)||'{}')}catch{return {}}}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function num(v){return Number(v||0)}
function fmt(v){return Math.round(v||0).toLocaleString('fr-FR')}
function addField(f){
 const [key,label,type,required,opts]=f;
 if(type==='select') return `<div class="field"><label for="${key}">${label}</label><select id="${key}" ${required?'required':''}><option value="">Choisir…</option>${(opts||[]).map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>`;
 return `<div class="field"><label for="${key}">${label}</label><input id="${key}" type="${type}" ${required?'required':''} ${type==='date'?'value="'+today()+'"':''} ${type==='number'?'min="0" step="any"':''}></div>`;
}
function renderModule(key){
 current=key; const m=modules[key]; const data=read().filter(x=>x.module===key).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
 $('#view').innerHTML=`<h2>${m.title}</h2><form id="entryForm"><div class="form-grid">${m.fields.map(addField).join('')}</div><div class="actions"><button class="primary" type="submit">Enregistrer</button><button class="secondary" type="reset">Effacer le formulaire</button></div></form><h3>Historique (${data.length})</h3>${renderTable(key,data)}`;
 $('#entryForm').addEventListener('submit',e=>{e.preventDefault();const payload={};m.fields.forEach(f=>payload[f[0]]=$('#'+f[0]).value);const records=read();records.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random(),module:key,payload,createdAt:new Date().toISOString(),synced:false});write(records);renderModule(key);$('#syncInfo').textContent='Enregistré sur cet appareil. En attente de synchronisation.';});
}
function renderTable(key,data){
 alert("JavaScript fonctionne");
 if(!data.length) return '<div class="empty">Aucune donnée enregistrée pour le moment.</div>';

 return '<div class="table-wrap"><table><thead><tr><th>Informations</th><th>Actions</th></tr></thead><tbody>'+
 data.map(r=>{
  const id=String(r.id);
  const infos=Object.entries(r.payload||{})
   .map(([k,v])=>'<b>'+k+'</b> : '+v).join('<br>');

  return '<tr><td>'+infos+'</td><td>'+
   '<button onclick="alert(\'TEST MODIFIER OK\')">Modifier</button> '+
   '<button onclick="window.deleteRecord(\''+key+'\',\''+id+'\')">Supprimer</button>'+
   '</td></tr>';
 }).join('')+
 '</tbody></table></div>';
}
function editRecord(key,id){
 const data=read();

 const item=data.find(r=>String(r.id)===String(id));

 if(!item){
  alert("Lot introuvable : "+id);
  return;
 }

 const values={...(item.payload||{})};

 for(const [name,label] of modules[key].fields){

  const answer=prompt(
   'Modifier '+label,
   values[name]??''
  );

  if(answer===null){
   alert("Modification annulée.");
   return;
  }

  values[name]=answer;
 }

 const updated=data.map(r=>
  String(r.id)===String(id)
   ? {
      ...r,
      payload:values,
      synced:false
     }
   : r
 );

 write(updated);
 renderModule(key);

 alert("Modification enregistrée avec succès !");
}
window.editRecord = editRecord;
function deleteRecord(key,id){
 if(!confirm('Confirmer la suppression ?'))return;
 const data=read();
 const updated=data.map(r=>r.id===id?{...r,deleted:true,synced:false}:r);
 write(updated);
 renderModule(key);
}
window.editRecord = function(key,id){
 alert("TEST : bouton Modifier fonctionne");
 editRecord(key,id);
};
window.deleteRecord = deleteRecord;
function renderSettings(){
 const c=cfg();
 $('#view').innerHTML=`<h2>Connexion Supabase</h2><p class="muted">Saisissez l’URL et la clé publique (anon/publishable) du nouveau projet SEN POULAILLER. Ne saisissez jamais la clé service_role ici.</p><form id="cfgForm"><div class="form-grid"><div class="field full"><label>URL du projet Supabase</label><input id="sbUrl" type="url" placeholder="https://xxxx.supabase.co" value="${esc(c.url||'')}"></div><div class="field full"><label>Clé publique (anon / publishable)</label><textarea id="sbKey" placeholder="Collez ici la clé publique">${esc(c.key||'')}</textarea></div><div class="field"><label>E-mail du compte</label><input id="sbEmail" type="email" autocomplete="username"></div><div class="field"><label>Mot de passe</label><input id="sbPass" type="password" autocomplete="current-password"></div></div><div class="actions"><button class="primary" type="submit">Enregistrer la configuration</button><button class="secondary" type="button" id="loginBtn">Se connecter</button><button class="secondary" type="button" id="signupBtn">Créer un compte</button><button class="secondary" type="button" id="logoutBtn">Déconnexion</button></div></form><div class="hint">La configuration est conservée sur cet appareil. Activez les politiques RLS du script SQL fourni avant d'utiliser le cloud.</div><p id="authInfo" class="muted"></p>`;
 $('#cfgForm').addEventListener('submit',e=>{e.preventDefault();localStorage.setItem(CFGKEY,JSON.stringify({url:$('#sbUrl').value.trim(),key:$('#sbKey').value.trim()}));initClient();$('#authInfo').textContent='Configuration enregistrée sur cet appareil.';});
 $('#loginBtn').onclick=()=>auth('signInWithPassword');
 $('#signupBtn').onclick=()=>auth('signUp');
 $('#logoutBtn').onclick=async()=>{if(client)await client.auth.signOut();$('#authInfo').textContent='Déconnecté.'};
}
let client=null;
function initClient(){const c=cfg();client=null;if(c.url&&c.key&&window.supabase?.createClient){client=window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});}return client}
async function auth(method){
 const c=initClient();if(!c){$('#authInfo').textContent='Enregistrez d’abord l’URL et la clé Supabase.';return}
 const email=$('#sbEmail').value.trim(),password=$('#sbPass').value;
 if(!email||!password){$('#authInfo').textContent='Saisissez votre e-mail et votre mot de passe.';return}
 const res=method==='signUp'?await c.auth.signUp({email,password}):await c.auth.signInWithPassword({email,password});
 $('#authInfo').textContent=res.error?res.error.message:(method==='signUp'?'Compte créé. Vérifiez votre e-mail si la confirmation est demandée.':'Connexion réussie.');
}
async function syncNow(){
 if(!navigator.onLine){
  $('#syncInfo').textContent='Pas d’Internet : les données restent sur le téléphone.';
  return;
 }
 const c=initClient();
 if(!c){
  $('#syncInfo').textContent='Configurez d’abord Supabase.';
  return;
 }
 const session=await c.auth.getSession();
 if(!session.data.session){
  $('#syncInfo').textContent='Connectez-vous à Supabase.';
  return;
 }
 const user=session.data.session.user;
 let records=read();
 const pending=records.filter(r=>!r.synced);

 $('#syncInfo').textContent='Synchronisation en cours…';

 for(const r of pending){
  const row={
   client_id:r.id,
   user_id:user.id,
   module:r.module,
   payload:r.payload,
   created_at:r.createdAt
  };
  const result=await c.from('farm_entries').upsert(row,{onConflict:'client_id'});
  if(result.error){
   $('#syncInfo').textContent='Erreur : '+result.error.message;
   return;
  }
  r.synced=true;
 }
 const pulled=await c.from('farm_entries')
  .select('client_id,module,payload,created_at')
  .order('created_at',{ascending:true});
 if(pulled.error){
  $('#syncInfo').textContent='Lecture cloud impossible : '+pulled.error.message;
  return;
 }
 const localUnsynced=read().filter(r=>!r.synced);
 const merged=(pulled.data||[]).map(row=>({
  id:row.client_id,
  module:row.module,
  payload:row.payload,
  createdAt:row.created_at,
  synced:true
 }));
 for(const r of localUnsynced){
  if(!merged.some(x=>x.id===r.id)) merged.push(r);
 }
   write(merged);
$('#syncInfo').textContent='Synchronisation terminée : '+pending.length+' envoyé(s), '+merged.length+' présent(s) sur cet appareil.';
}
 function refreshStats(){
 const a=read(),get=k=>a.filter(r=>r.module===k).map(r=>r.payload);
 const lots=get('lots'),sales=get('sales'),expenses=get('expenses'),deaths=get('deaths');
 const initial=lots.reduce((s,x)=>s+num(x.initial),0),sold=sales.reduce((s,x)=>s+num(x.qty),0),dead=deaths.reduce((s,x)=>s+num(x.qty),0);
 $('#statLots').textContent=lots.length;$('#statBirds').textContent=fmt(initial-sold-dead);
 $('#statSales').textContent=fmt(sales.reduce((s,x)=>s+num(x.qty)*num(x.price),0));
 $('#statExpenses').textContent=fmt(expenses.reduce((s,x)=>s+num(x.amount),0));
 $('#statDeaths').textContent=fmt(dead);$('#statPending').textContent=a.filter(r=>!r.synced).length;
}
function renderReports(){
 const a=read(),sales=a.filter(r=>r.module==='sales'),expenses=a.filter(r=>r.module==='expenses'),lots=a.filter(r=>r.module==='lots'),deaths=a.filter(r=>r.module==='deaths'),vacc=a.filter(r=>r.module==='vaccines');
 const totalSales=sales.reduce((s,r)=>s+num(r.payload.qty)*num(r.payload.price),0),totalExpenses=expenses.reduce((s,r)=>s+num(r.payload.amount),0);
 $('#view').innerHTML=`<h2>Reçus et rapports</h2><div class="hint">Le bouton Imprimer ouvre la boîte d’impression Android ou ordinateur. Choisissez « Enregistrer au format PDF » pour conserver un document.</div><div class="actions"><button class="primary" id="receiptBtn">Créer / imprimer un reçu vierge</button><button class="secondary" id="reportBtn">Imprimer le rapport</button><button class="secondary" id="csvBtn">Exporter les données CSV</button></div><p class="muted">Rapport global : ${lots.length} lot(s), ${sales.length} vente(s), ${deaths.length} mortalité(s), ${vacc.length} vaccination(s).</p>`;
 $('#receiptBtn').onclick=()=>printReceipt();$('#reportBtn').onclick=()=>printReport({lots,sales,expenses,deaths,vacc,totalSales,totalExpenses});$('#csvBtn').onclick=()=>exportCSV(a);
}
function printReceipt(){
 const w=window.open('','_blank');if(!w){alert('Autorisez les fenêtres d’impression dans votre navigateur.');return}
 w.document.write(`<html><head><title>Reçu SADIKH SERVICES</title><style>body{font:15px Arial;padding:25px;color:#173f2a}h1{text-align:center}table{width:100%;border-collapse:collapse;margin-top:25px}td,th{border:1px solid #999;padding:12px;text-align:left}.line{margin:24px 0;border-bottom:1px solid #999;padding:8px}</style></head><body><h1>SADIKH SERVICES</h1><h2>REÇU DE VENTE</h2><p>N° reçu : __________________ Date : ____ / ____ / ______</p><p>Client : __________________________ Téléphone : __________________</p><p>Code lot : ________________________ Paiement : ___________________</p><table><tr><th>Désignation</th><th>Quantité</th><th>Prix unitaire</th><th>Montant</th></tr>${Array.from({length:5},()=>'<tr><td style="height:28px"></td><td></td><td></td><td></td></tr>').join('')}<tr><th colspan="3">TOTAL À PAYER</th><th>________ FCFA</th></tr></table><p style="margin-top:45px">Signature / Cachet : _________________________</p><p style="text-align:center;margin-top:45px">Merci pour votre confiance !</p><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
}
function printReport(d){
 const w=window.open('','_blank');if(!w){alert('Autorisez les fenêtres d’impression dans votre navigateur.');return}
 const profit=d.totalSales-d.totalExpenses;
 w.document.write(`<html><head><title>Rapport SADIKH SERVICES</title><style>body{font:15px Arial;padding:28px;color:#173f2a}h1{text-align:center}table{width:100%;border-collapse:collapse}td{padding:12px;border:1px solid #aaa}.muted{color:#666}</style></head><body><h1>SADIKH SERVICES</h1><h2>RAPPORT DE GESTION DU POULAILLER</h2><p>Date : ${new Date().toLocaleDateString('fr-FR')}</p><table>${[['Lots enregistrés',d.lots.length],['Ventes enregistrées',d.sales.length],['Chiffre d’affaires',d.totalSales.toLocaleString('fr-FR')+' FCFA'],['Dépenses saisies',d.totalExpenses.toLocaleString('fr-FR')+' FCFA'],['Bénéfice provisoire',profit.toLocaleString('fr-FR')+' FCFA'],['Mortalités',d.deaths.reduce((s,r)=>s+num(r.payload.qty),0)],['Vaccinations enregistrées',d.vacc.length]].map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td></tr>`).join('')}</table><p class="muted">Rapport calculé à partir des données présentes sur cet appareil au moment de l’impression.</p><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
}
function exportCSV(a){
 const rows=[['id','module','createdAt','payload'],...a.map(r=>[r.id,r.module,r.createdAt,JSON.stringify(r.payload)])];
 const csv=rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\n');
 const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='SADIKH_SERVICES_donnees.csv';link.click();URL.revokeObjectURL(url);
}
document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>{
 document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active',x===b));
 if(b.dataset.view==='settings')renderSettings();else if(b.dataset.view==='reports')renderReports();else renderModule(b.dataset.view);
}));
$('#syncBtn').addEventListener('click',syncNow);
window.addEventListener('online',()=>{ $('#netBadge').textContent='Internet disponible';syncNow();});
window.addEventListener('offline',()=>$('#netBadge').textContent='Hors ligne');
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
initClient();refreshStats();renderModule('lots');
function visibleRecords(a=read()){
  return a.filter(r=>!r.deleted && !(r.payload && r.payload._deleted));
}
$('#netBadge').textContent=navigator.onLine?'Internet disponible':'Hors ligne';
