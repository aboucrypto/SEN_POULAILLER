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
 customers:{title:'Fichier clients',fields:[['name','Nom client','text',true],['phone','Téléphone','tel'],['address','Adresse / quartier','text'],['kind','Type client','text']]},
 directory:{title:'Annuaire des restaurants et traiteurs',fields:[['name','Nom du restaurant ou de la personne','text',true],['phone','Téléphone / WhatsApp','tel',true],['address','Adresse / quartier','text'],['specialty','Spécialités culinaires','text'],['service','Type de service','select',true,['Traiteur pour cérémonies','Livraison à domicile','Cuisine à domicile','Restaurant','Autre']],['price','Tarifs indicatifs (FCFA)','text'],['notes','Observations','text']]}
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
function ageFromDate(dateValue){
 if(!dateValue) return null;
 const start=new Date(dateValue+'T00:00:00');
 if(Number.isNaN(start.getTime())) return null;
 const now=new Date(); now.setHours(0,0,0,0);
 const days=Math.max(0,Math.floor((now-start)/86400000));
 return {days,weeks:Math.floor(days/7),remaining:days%7};
}
function refreshLotAges(){
 const target=$('#lotAges'); if(!target) return;
 const lots=visibleRecords().filter(r=>r.module==='lots');
 if(!lots.length){target.innerHTML='<div class="empty">Aucun lot enregistré.</div>';return}
 target.innerHTML=lots.map(r=>{
  const p=r.payload||{},age=ageFromDate(p.date);
  const ageText=age?`${age.weeks} semaine(s) et ${age.remaining} jour(s)`:'Date d’arrivée non renseignée';
  const daysText=age?`${age.days} jour(s) au total`:'';
  return `<article class="age-card"><strong>${esc(p.code||'Lot sans code')}</strong><div class="age-value">${ageText}</div><div class="age-sub">${daysText}${p.breed?' • '+esc(p.breed):''}</div></article>`;
 }).join('');
}
function renderModule(key){
 current=key; const m=modules[key]; const data=visibleRecords().filter(x=>x.module===key).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
 $('#view').innerHTML=`<h2>${m.title}</h2><form id="entryForm"><div class="form-grid">${m.fields.map(addField).join('')}</div><div class="actions"><button class="primary" type="submit">Enregistrer</button><button class="secondary" type="reset">Effacer le formulaire</button></div></form><h3>Historique (${data.length})</h3>${renderTable(key,data)}`;
 $('#entryForm').addEventListener('submit',e=>{e.preventDefault();const payload={};m.fields.forEach(f=>payload[f[0]]=$('#'+f[0]).value);const records=read();records.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random(),module:key,payload,createdAt:new Date().toISOString(),synced:false});write(records);renderModule(key);$('#syncInfo').textContent='Enregistré sur cet appareil. En attente de synchronisation.';});
}
function renderTable(key,data){
 if(!data.length) return '<div class="empty">Aucune donnée enregistrée pour le moment.</div>';
 return '<div class="table-wrap"><table><thead><tr><th>Informations</th><th>Actions</th></tr></thead><tbody>'+
 data.map(r=>{
  const id=String(r.id);
  const infos=Object.entries(r.payload||{}).filter(([k])=>k!=='_deleted').map(([k,v])=>'<b>'+esc(k)+'</b> : '+esc(v)).join('<br>');
  const whatsapp=key==='directory'&&r.payload.phone?'<a href="https://wa.me/'+String(r.payload.phone).replace(/\\D/g,'').replace(/^0/,'221')+'" target="_blank" rel="noopener" style="display:inline-block;background:#168b45;color:white;padding:9px 14px;border-radius:8px;text-decoration:none;font-weight:bold;margin:4px">WhatsApp</a> ':'';
  return `<tr><td>${infos}</td><td>${whatsapp}<button onclick="window.editRecord('${esc(key)}','${esc(id)}')">Modifier</button> <button onclick="window.deleteRecord('${esc(key)}','${esc(id)}')">Supprimer</button></td></tr>`;
 }).join('')+'</tbody></table></div>';
}
function editRecord(key,id){
 const data=read(),item=data.find(r=>String(r.id)===String(id)&&r.module===key);
 if(!item){alert('Enregistrement introuvable : '+id);return}
 const values={...(item.payload||{})};
 for(const [name,label] of modules[key].fields){
  const answer=prompt('Modifier '+label,values[name]??'');
  if(answer===null){alert('Modification annulée.');return}
  values[name]=answer;
 }
 const updated=data.map(r=>String(r.id)===String(id)&&r.module===key?{...r,payload:values,synced:false}:r);
 write(updated);renderModule(key);alert('Modification enregistrée. Synchronisez pour envoyer le changement au cloud.');
}
window.editRecord=editRecord;
function deleteRecord(key,id){
 if(!confirm('Confirmer la suppression ?')) return;
 const data=read();
 const updated=data.map(r=>String(r.id)===String(id)&&r.module===key?{...r,deleted:true,synced:false}:r);
 write(updated);renderModule(key);alert('Suppression effectuée. Synchronisez pour envoyer le changement au cloud.');
}
window.deleteRecord=deleteRecord;

function renderGps(){
 current='gps';
 $('#view').innerHTML=`<h2>GPS – Services à proximité</h2>
 <p class="muted">Autorisez la localisation du téléphone pour rechercher les services autour de vous. Une connexion Internet est nécessaire.</p>
 <div class="gps-controls"><div class="field"><label for="gpsCategory">Type de service</label><select id="gpsCategory"><option value="all">Tous les services</option><option value="restaurant">Restaurants et traiteurs</option><option value="pharmacy">Pharmacies</option><option value="hotel">Hôtels</option><option value="market">Marchés et commerces</option><option value="fuel">Stations-service</option><option value="bank">Banques et services financiers</option></select></div><button id="gpsSearch" class="primary">Me localiser</button></div>
 <div class="hint">Le GPS sert uniquement à centrer la recherche autour de votre position. La recherche utilise OpenStreetMap.</div>
 <p id="gpsInfo" class="muted">Appuyez sur « Me localiser » pour commencer.</p><div id="gpsMap"></div><div id="gpsResults" class="gps-results"></div>`;
 $('#gpsSearch').addEventListener('click',searchNearby);
}
function haversineKm(lat1,lon1,lat2,lon2){
 const rad=x=>x*Math.PI/180,R=6371;
 const dLat=rad(lat2-lat1),dLon=rad(lon2-lon1);
 const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;
 return 2*R*Math.asin(Math.sqrt(a));
}
function categoryQuery(category){
 const common='node(around:5000,{LAT},{LON})[name];way(around:5000,{LAT},{LON})[name];relation(around:5000,{LAT},{LON})[name];';
 const filters={
  all:'node(around:5000,{LAT},{LON})[name][~"^(amenity|shop|tourism|leisure)$"~"."];way(around:5000,{LAT},{LON})[name][~"^(amenity|shop|tourism|leisure)$"~"."];',
  restaurant:'node(around:5000,{LAT},{LON})[amenity~"restaurant|fast_food|cafe"];way(around:5000,{LAT},{LON})[amenity~"restaurant|fast_food|cafe"];',
  pharmacy:'node(around:5000,{LAT},{LON})[amenity=pharmacy];way(around:5000,{LAT},{LON})[amenity=pharmacy];',
  hotel:'node(around:5000,{LAT},{LON})[tourism~"hotel|guest_house|hostel"];way(around:5000,{LAT},{LON})[tourism~"hotel|guest_house|hostel"];',
  market:'node(around:5000,{LAT},{LON})[shop];way(around:5000,{LAT},{LON})[shop];node(around:5000,{LAT},{LON})[amenity=marketplace];way(around:5000,{LAT},{LON})[amenity=marketplace];',
  fuel:'node(around:5000,{LAT},{LON})[amenity=fuel];way(around:5000,{LAT},{LON})[amenity=fuel];',
  bank:'node(around:5000,{LAT},{LON})[amenity~"bank|atm|bureau_de_change"];way(around:5000,{LAT},{LON})[amenity~"bank|atm|bureau_de_change"];'
 };
 return '[out:json][timeout:25];('+filters[category]+');out center tags;';
}
function labelFor(tags){
 const v=tags.amenity||tags.shop||tags.tourism||tags.leisure||'Service';
 const labels={restaurant:'Restaurant',fast_food:'Restauration rapide',cafe:'Café',pharmacy:'Pharmacie',hotel:'Hôtel',guest_house:'Maison d’hôtes',hostel:'Auberge',marketplace:'Marché',fuel:'Station-service',bank:'Banque',atm:'Distributeur',bureau_de_change:'Change'};
 return labels[v]||String(v).replaceAll('_',' ');
}
async function searchNearby(){
 const info=$('#gpsInfo'),results=$('#gpsResults'),map=$('#gpsMap'),category=$('#gpsCategory').value;
 if(!navigator.geolocation){info.textContent='La géolocalisation n’est pas disponible sur ce navigateur.';return}
 if(!navigator.onLine){info.textContent='Connectez-vous à Internet pour rechercher les services à proximité.';return}
 info.textContent='Recherche de votre position GPS…';results.innerHTML='';map.innerHTML='';
 navigator.geolocation.getCurrentPosition(async pos=>{
  const lat=pos.coords.latitude,lon=pos.coords.longitude;
  info.textContent='Position obtenue. Recherche des services dans un rayon de 5 km…';
  const query=categoryQuery(category).replaceAll('{LAT}',String(lat)).replaceAll('{LON}',String(lon));
  try{
   const response=await fetch('https://ovp.dresel.systems/api-af/interpreter',{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:query});
   if(!response.ok) throw new Error('Le service de carte ne répond pas ('+response.status+').');
   const json=await response.json();
   const found=(json.elements||[]).map(el=>{
    const tags=el.tags||{},p=el.center||el;
    if(typeof p.lat!=='number'||typeof p.lon!=='number') return null;
    return {name:tags.name||'Service sans nom',kind:labelFor(tags),lat:p.lat,lon:p.lon,distance:haversineKm(lat,lon,p.lat,p.lon),address:[tags['addr:street'],tags['addr:city']].filter(Boolean).join(', ')};
   }).filter(Boolean).sort((a,b)=>a.distance-b.distance);
   if(!found.length){info.textContent='Aucun résultat trouvé dans un rayon de 5 km. Essayez une autre catégorie ou élargissez la recherche plus tard.';return}
   info.textContent=found.length+' résultat(s) trouvé(s) dans un rayon d’environ 5 km.';
   results.innerHTML=found.slice(0,40).map(p=>`<article class="gps-item"><strong>${esc(p.name)}</strong><div class="gps-meta">${esc(p.kind)} • ${p.distance<1?Math.round(p.distance*1000)+' m':p.distance.toFixed(1).replace('.',',')+' km'}${p.address?' • '+esc(p.address):''}</div><a class="gps-link" href="https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=17/${p.lat}/${p.lon}" target="_blank" rel="noopener">Voir sur la carte</a></article>`).join('');
   const delta=0.04;
   const bbox=[lon-delta,lat-delta,lon+delta,lat+delta].join('%2C');
   map.innerHTML=`<iframe class="gps-map" title="Carte des services à proximité" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}"></iframe>`;
  }catch(err){info.textContent='Impossible de charger les résultats : '+err.message+'. Réessayez avec une bonne connexion Internet.'}
 },err=>{
  const messages={1:'Autorisation GPS refusée. Autorisez la localisation dans les paramètres du navigateur.',2:'Position GPS indisponible. Activez la localisation du téléphone.',3:'La recherche GPS a pris trop de temps. Réessayez.'};
  info.textContent=messages[err.code]||'Erreur de localisation.';
 },{enableHighAccuracy:true,timeout:20000,maximumAge:60000});
}
function renderSettings(){
 const c=cfg();

 $('#view').innerHTML=`
 <h2>Connexion Supabase</h2>
 <p class="muted">Saisissez l’URL et la clé publique du projet SEN POULAILLER. Ne saisissez jamais la clé service_role ici.</p>

 <form id="cfgForm">
 <div class="form-grid">
 <div class="field full">
 <label>URL du projet Supabase</label>
 <input id="sbUrl" type="url" placeholder="https://xxxx.supabase.co" value="${esc(c.url||'')}">
 </div>
 <div class="field full">
 <label>Clé publique (anon / publishable)</label>
 <textarea id="sbKey" placeholder="Collez ici la clé publique">${esc(c.key||'')}</textarea>
 </div>
 <div class="field">
 <label>E-mail du compte</label>
 <input id="sbEmail" type="email" autocomplete="username">
 </div>
 <div class="field">
 <label>Mot de passe</label>
 <input id="sbPass" type="password" autocomplete="current-password">
 </div>
 </div>

 <div class="actions">
 <button class="primary" type="submit">Enregistrer la configuration</button>
 <button class="secondary" type="button" id="loginBtn">Se connecter</button>
 <button class="secondary" type="button" id="signupBtn">Créer un compte</button>
 <button class="secondary" type="button" id="logoutBtn">Déconnexion</button>
 </div>
 </form>

 <h3>Notifications du poulailler</h3>
 <p class="muted">Bulletin météo et alertes de prévention.</p>
 <button class="primary" type="button" id="pushBtn">
 Activer les notifications sur ce téléphone
 </button>
 <p id="pushInfo" class="muted"></p>

 <div class="hint">La configuration est conservée sur cet appareil.</div>
 <p id="authInfo" class="muted"></p>
 `;

 $('#cfgForm').addEventListener('submit',e=>{
  e.preventDefault();
  localStorage.setItem(CFGKEY,JSON.stringify({
   url:$('#sbUrl').value.trim(),
   key:$('#sbKey').value.trim()
  }));
  initClient();
  $('#authInfo').textContent='Configuration enregistrée sur cet appareil.';
 });

 $('#loginBtn').onclick=()=>auth('signInWithPassword');
 $('#signupBtn').onclick=()=>auth('signUp');

 $('#logoutBtn').onclick=async()=>{
  if(client) await client.auth.signOut();
  $('#authInfo').textContent='Déconnecté.';
 };

 $('#pushBtn').onclick=()=>{
  if(typeof window.enablePushNotifications==='function'){
   window.enablePushNotifications();
  }else{
   $('#pushInfo').textContent='La fonction de notification doit encore être ajoutée.';
  }
 };
}
let client=null;
function initClient(){
 const c=cfg();
 client=null;
 if(c.url&&c.key&&window.supabase?.createClient){
  client=window.supabase.createClient(c.url,c.key,{
   auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:true
   }
  });
 }
 return client;
}

async function ensureAnonymousSession(){
 const c=initClient();
 if(!c) throw new Error('Configurez Supabase.');

 const current=await c.auth.getSession();
 if(current.error) throw current.error;

 if(current.data.session){
  return current.data.session;
 }

 const result=await c.auth.signInAnonymously();
 if(result.error) throw result.error;

 return result.data.session;
}
async function auth(method){
 const c=initClient();if(!c){$('#authInfo').textContent='Enregistrez d’abord l’URL et la clé Supabase.';return}
 const email=$('#sbEmail').value.trim(),password=$('#sbPass').value;
 if(!email||!password){$('#authInfo').textContent='Saisissez votre e-mail et votre mot de passe.';return}
 const res=method==='signUp'?await c.auth.signUp({email,password}):await c.auth.signInWithPassword({email,password});
 $('#authInfo').textContent=res.error?res.error.message:(method==='signUp'?'Compte créé. Vérifiez votre e-mail si la confirmation est demandée.':'Connexion réussie.');
}
async function syncNow(){
 try {
  if(!navigator.onLine){
   $('#syncInfo').textContent='Pas d’Internet.';
   return;
  }

  const c=initClient();
  if(!c){
   $('#syncInfo').textContent='Configurez Supabase.';
   return;
  }

  let session=await c.auth.getSession();

  if(session.error) throw session.error;

  if(!session.data.session){
   const login=await c.auth.signInAnonymously();
   if(login.error) throw login.error;
   session={data:{session:login.data.session}};
  }

  const user=session.data.session.user;
  const records=read();

  $('#syncInfo').textContent='Synchronisation en cours…';

  const pending=records.filter(r=>!r.synced);

  for(const r of pending){
   const row={
    client_id:r.id,
    user_id:user.id,
    module:r.module,
    payload:{...(r.payload||{}),_deleted:!!r.deleted},
    created_at:r.createdAt
   };

   const result=await c.from('farm_entries')
    .upsert(row,{onConflict:'client_id'});

   if(result.error) throw result.error;
   r.synced=true;
  }

  write(records);

  const pulled=await c.from('farm_entries')
   .select('client_id,module,payload,created_at')
   .eq('user_id',user.id);

  if(pulled.error) throw pulled.error;

  const mergedMap=new Map();

  records.forEach(r=>mergedMap.set(String(r.id),r));

  (pulled.data||[]).forEach(row=>{
   mergedMap.set(String(row.client_id),{
    id:row.client_id,
    module:row.module,
    payload:row.payload||{},
    createdAt:row.created_at,
    deleted:!!(row.payload&&row.payload._deleted),
    synced:true
   });
  });

  const merged=Array.from(mergedMap.values());
  write(merged);

  $('#syncInfo').textContent=
   'Synchronisation terminée : '+pending.length+
   ' envoyé(s), '+(pulled.data||[]).length+' récupéré(s).';

 } catch(error) {
  $('#syncInfo').textContent='Erreur de synchronisation : '+error.message;
 }
}
function visibleRecords(a=read()){return a.filter(r=>!r.deleted&&!(r.payload&&r.payload._deleted))}
function refreshStats(){
 const a=visibleRecords(),get=k=>a.filter(r=>r.module===k).map(r=>r.payload||{});
 const lots=get('lots'),sales=get('sales'),expenses=get('expenses'),deaths=get('deaths');
 const initial=lots.reduce((s,x)=>s+num(x.initial),0),sold=sales.reduce((s,x)=>s+num(x.qty),0),dead=deaths.reduce((s,x)=>s+num(x.qty),0);
 $('#statLots').textContent=lots.length;$('#statBirds').textContent=fmt(initial-sold-dead);
 $('#statSales').textContent=fmt(sales.reduce((s,x)=>s+num(x.qty)*num(x.price),0));
 $('#statExpenses').textContent=fmt(expenses.reduce((s,x)=>s+num(x.amount),0));$('#statDeaths').textContent=fmt(dead);
 $('#statPending').textContent=a.filter(r=>!r.synced).length;
 refreshLotAges();
}
function renderReports(){
 const a=visibleRecords(),sales=a.filter(r=>r.module==='sales'),expenses=a.filter(r=>r.module==='expenses'),lots=a.filter(r=>r.module==='lots'),deaths=a.filter(r=>r.module==='deaths'),vacc=a.filter(r=>r.module==='vaccines');
 const totalSales=sales.reduce((s,r)=>s+num(r.payload.qty)*num(r.payload.price),0),totalExpenses=expenses.reduce((s,r)=>s+num(r.payload.amount),0);
 $('#view').innerHTML=`<h2>Reçus et rapports</h2><div class="hint">Le bouton Imprimer ouvre la boîte d’impression Android ou ordinateur. Choisissez « Enregistrer au format PDF » pour conserver un document.</div><div class="actions"><button class="primary" id="receiptBtn">Créer / imprimer un reçu vierge</button><button class="secondary" id="reportBtn">Imprimer le rapport</button><button class="secondary" id="csvBtn">Exporter les données CSV</button></div><p class="muted">Rapport global : ${lots.length} lot(s), ${sales.length} vente(s), ${deaths.length} mortalité(s), ${vacc.length} vaccination(s).</p>`;
 $('#receiptBtn').onclick=()=>printReceipt();$('#reportBtn').onclick=()=>printReport({lots,sales,expenses,deaths,vacc,totalSales,totalExpenses});$('#csvBtn').onclick=()=>exportCSV(a);
}
function printReceipt(){
 const w=window.open('','_blank');if(!w){alert('Autorisez les fenêtres d’impression dans votre navigateur.');return}
 w.document.write(`<html><head><title>Reçu SADIKH SERVICES</title><style>body{font:15px Arial;padding:25px;color:#173f2a}h1{text-align:center}table{width:100%;border-collapse:collapse;margin-top:25px}td,th{border:1px solid #999;padding:12px;text-align:left}</style></head><body><h1>SADIKH SERVICES</h1><h2>REÇU DE VENTE</h2><p>N° reçu : __________________ Date : ____ / ____ / ______</p><p>Client : __________________________ Téléphone : __________________</p><p>Code lot : ________________________ Paiement : ___________________</p><table><tr><th>Désignation</th><th>Quantité</th><th>Prix unitaire</th><th>Montant</th></tr>${Array.from({length:5},()=>'<tr><td style="height:28px"></td><td></td><td></td><td></td></tr>').join('')}<tr><th colspan="3">TOTAL À PAYER</th><th>________ FCFA</th></tr></table><p style="margin-top:45px">Signature / Cachet : _________________________</p><p style="text-align:center;margin-top:45px">Merci pour votre confiance !</p><script>window.onload=()=>window.print()<\\/script></body></html>`);w.document.close();
}
function printReport(d){
 const w=window.open('','_blank');if(!w){alert('Autorisez les fenêtres d’impression dans votre navigateur.');return}
 const profit=d.totalSales-d.totalExpenses;
 w.document.write(`<html><head><title>Rapport SADIKH SERVICES</title><style>body{font:15px Arial;padding:28px;color:#173f2a}h1{text-align:center}table{width:100%;border-collapse:collapse}td{padding:12px;border:1px solid #aaa}.muted{color:#666}</style></head><body><h1>SADIKH SERVICES</h1><h2>RAPPORT DE GESTION DU POULAILLER</h2><p>Date : ${new Date().toLocaleDateString('fr-FR')}</p><table>${[['Lots enregistrés',d.lots.length],['Ventes enregistrées',d.sales.length],['Chiffre d’affaires',d.totalSales.toLocaleString('fr-FR')+' FCFA'],['Dépenses saisies',d.totalExpenses.toLocaleString('fr-FR')+' FCFA'],['Bénéfice provisoire',profit.toLocaleString('fr-FR')+' FCFA'],['Mortalités',d.deaths.reduce((s,r)=>s+num(r.payload.qty),0)],['Vaccinations enregistrées',d.vacc.length]].map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td></tr>`).join('')}</table><p class="muted">Rapport calculé à partir des données présentes sur cet appareil au moment de l’impression.</p><script>window.onload=()=>window.print()<\\/script></body></html>`);w.document.close();
}
function exportCSV(a){
 const rows=[['id','module','createdAt','payload'],...a.map(r=>[r.id,r.module,r.createdAt,JSON.stringify(r.payload)])];
 const csv=rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\\n');
 const blob=new Blob(['\\ufeff'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='SEN_POULAILLER_donnees.csv';link.click();URL.revokeObjectURL(url);
}
document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>{
 document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active',x===b));
 if(b.dataset.view==='settings')renderSettings();else if(b.dataset.view==='reports')renderReports();else if(b.dataset.view==='gps')renderGps();else renderModule(b.dataset.view);
}));
$('#syncBtn').addEventListener('click',syncNow);
window.addEventListener('online',()=>{$('#netBadge').textContent='Internet disponible';syncNow()});
window.addEventListener('offline',()=>$('#netBadge').textContent='Hors ligne');
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
window.enablePushNotifications = async function(){
 const info=$('#pushInfo');

 try {
  info.textContent='Vérification du navigateur…';

  if(!('serviceWorker' in navigator) ||
     !('PushManager' in window) ||
     !('Notification' in window)){
   throw new Error('Navigateur incompatible avec les notifications.');
  }

  if(!navigator.onLine){
   throw new Error('Connectez-vous à Internet.');
  }

  info.textContent='Demande d’autorisation…';

  const permission=await Notification.requestPermission();

  if(permission!=='granted'){
   throw new Error('Autorisation des notifications refusée.');
  }

  info.textContent='Installation du service worker…';

  const registration=await navigator.serviceWorker.register('./sw.js');

  info.textContent='Attente du service worker…';

  const ready=await Promise.race([
   navigator.serviceWorker.ready,
   new Promise((_,reject)=>
    setTimeout(()=>reject(
     new Error('Service Worker bloqué. Vérifiez sw.js.')
    ),15000)
   )
  ]);

  if(!ready.active){
   throw new Error('Service Worker non actif.');
  }

  info.textContent='Connexion à Supabase…';

  const c=initClient();

  if(!c) throw new Error('Configuration Supabase absente.');

  let session=await c.auth.getSession();

  if(!session.data.session){
   const login=await c.auth.signInAnonymously();
   if(login.error) throw login.error;
   session={data:{session:login.data.session}};
  }

  info.textContent='Enregistrement du téléphone…';

  const publicKey=BAit1stQ7qGz6WF59JSpoCB7eBN8nHfFwyZ0OX-SxkobTb9bXun5lBivkgyY1Hc5SDsqJxqS4Y1II6oZ9uxfjg';

  const padding='='.repeat((4-publicKey.length%4)%4);
  const raw=atob((publicKey+padding).replace(/-/g,'+').replace(/_/g,'/'));

  const applicationServerKey=Uint8Array.from(
   raw,c=>c.charCodeAt(0)
  );

  let subscription=await ready.pushManager.getSubscription();

  if(!subscription){
   subscription=await ready.pushManager.subscribe({
    userVisibleOnly:true,
    applicationServerKey
   });
  }

  info.textContent='Envoi à Supabase…';

  const response=await fetch(
   c.supabaseUrl+'/functions/v1/bulletin-poulailler',
   {
    method:'POST',
    headers:{
     'Content-Type':'application/json',
     'apikey':cfg().key,
     'Authorization':'Bearer '+session.data.session.access_token
    },
    body:JSON.stringify({
     subscription:subscription.toJSON()
    })
   }
  );

  const result=await response.json();

  if(!response.ok || !result.success){
   throw new Error(result.error||'Erreur Supabase.');
  }

  info.textContent='Succès ! Téléphone enregistré.';

 } catch(error) {
  console.error('Erreur notifications:',error);
  info.textContent='Erreur : '+error.message;
 }
};
$('#netBadge').textContent=navigator.onLine?'Internet disponible':'Hors ligne';
