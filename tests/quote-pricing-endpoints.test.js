const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function harness(){
 const state={yepii_leads:[],yepii_contacts:[],sent:[],quotes:[],quote_items:[],quote_events:[],quote_acceptances:[],quote_emails:[],writes:0,allowAccess:true,authenticated:true};
 const db={from(table){let operation='select',payload,columns='*',filters=[];const query={
  select(value='*'){columns=value;return query},insert(value){operation='insert';payload=value;return query},update(value){operation='update';payload=value;return query},delete(){operation='delete';return query},eq(key,value){filters.push(row=>row[key]===value);return query},order(){return query},limit(){return query},is(key,value){filters.push(row=>row[key]===value);return query},
  single:async()=>{const result=await execute();return {...result,data:result.data?.[0]??null}},maybeSingle:async()=>{const result=await execute();return {...result,data:result.data?.[0]??null}},then(resolve,reject){return execute().then(resolve,reject)}
 };async function execute(){let rows=state[table]||[];if(operation==='insert'){state.writes++;const input=Array.isArray(payload)?payload:[payload];rows.push(...input.map((row,index)=>table==='quotes'?{id:'q1',public_token:'public-link',short_token:'ABCDEF',...row}:{id:`${table}-${rows.length+index+1}`,...row}));state[table]=rows;rows=rows.slice(-input.length)}else if(operation==='update'){state.writes++;rows=rows.filter(row=>filters.every(fn=>fn(row)));rows.forEach(row=>Object.assign(row,payload))}else if(operation==='delete'){state.writes++;state[table]=rows.filter(row=>!filters.every(fn=>fn(row)));rows=[]}else rows=rows.filter(row=>filters.every(fn=>fn(row)));
 // Return all columns deliberately; the public serializer must still prevent leakage.
 return {data:rows.map(row=>({...row})),error:null}}
 return query}};
 const actor={supabase:db,user:{id:'u1'},member:{role:'administrador',full_name:'Equipe Yepii',email:'interno@example.com'}};
 function load(name){const filename=path.resolve(__dirname,'../netlify/functions',name+'.js');const mod={exports:{}};const context={module:mod,exports:mod.exports,require(spec){if(spec==='../lib/auth')return {getActor:async()=>state.authenticated?actor:null,canWriteQuotes:()=>true,canAccessQuote:async()=>state.allowAccess};if(spec==='../lib/quote-reopening'){const helper={exports:{}};vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../netlify/lib/quote-reopening.js'),'utf8'),{module:helper,require:()=>({canWriteQuotes:()=>true,canAccessQuote:async()=>state.allowAccess})});return helper.exports;}if(spec==='../lib/email')return {sendQuoteEmail:async(q,opts)=>{state.sent.push({q,opts});return {sent:false}},recordQuoteEmail:async()=>{}};if(spec==='@supabase/supabase-js')return {createClient:()=>db};return require(path.resolve(path.dirname(filename),spec))},process:{env:{}},Buffer,Date,Intl,JSON,Number,String,Array,Object};vm.runInNewContext(fs.readFileSync(filename,'utf8'),context,{filename});return mod.exports.handler}
 return {state,save:load('save-quote'),admin:load('admin-get-quote'),buyer:load('get-quote')};
}
const event=(quote)=>({httpMethod:'POST',headers:{authorization:'Bearer local-test'},body:JSON.stringify({action:'draft',quote:{quote_number:'Y26-10001',freight:10,items:[quote]}})});
test('save and admin reopen retain internal data; public quote returns only selling data',async()=>{
 const h=harness();const saved=await h.save(event({description:'Produto',quantity:2,unit_price:999,unit_cost:100,markup_percent:35,supplier_name:'Fornecedor privado'}));
 assert.equal(saved.statusCode,200,saved.body);assert.equal(h.state.quote_items[0].unit_price,135);assert.equal(h.state.quotes[0].total,280);
 const admin=await h.admin({httpMethod:'GET',queryStringParameters:{id:'q1'}});assert.equal(admin.statusCode,200,admin.body);const internal=JSON.parse(admin.body).quote.items[0];assert.equal(internal.unit_cost,100);assert.equal(internal.markup_percent,35);assert.equal(internal.supplier_name,'Fornecedor privado');
 h.state.quotes[0].status='sent';h.state.quotes[0].first_viewed_at='2026-10-21T00:00:00Z';const buyer=await h.buyer({queryStringParameters:{token:'public-link'}});assert.equal(buyer.statusCode,200,buyer.body);const item=JSON.parse(buyer.body).quote.items[0];assert.equal(item.unit_price,135);for(const key of ['supplier_name','unit_cost','markup_percent'])assert.equal(Object.hasOwn(item,key),false);assert.equal(buyer.body.includes('Fornecedor privado'),false);
});
test('manual price with blank markup persists as null',async()=>{
 const h=harness();const result=await h.save(event({description:'Produto',quantity:1,unit_price:149.9,unit_cost:100,markup_percent:null}));assert.equal(result.statusCode,200,result.body);assert.equal(h.state.quote_items[0].markup_percent,null);assert.equal(h.state.quote_items[0].unit_price,149.9);
});
test('invalid costing data causes no database writes',async()=>{
 const h=harness();const result=await h.save(event({description:'Produto',quantity:1,unit_price:10,unit_cost:-100,markup_percent:30}));assert.equal(result.statusCode,400);assert.equal(h.state.writes,0);
});
test('internal prices require both a session and permission to open the quote',async()=>{
 const h=harness();h.state.authenticated=false;assert.equal((await h.admin({httpMethod:'GET',queryStringParameters:{id:'q1'}})).statusCode,401);h.state.authenticated=true;h.state.quotes.push({id:'q1'});h.state.allowAccess=false;assert.equal((await h.admin({httpMethod:'GET',queryStringParameters:{id:'q1'}})).statusCode,403);
});

test('manual override with markup survives save, admin reopen and buyer response',async()=>{
 const h=harness();const result=await h.save(event({description:'Produto',quantity:2,unit_price:125.49,unit_cost:100,markup_percent:30.21,manual_unit_price:true}));
 assert.equal(result.statusCode,200,result.body);assert.equal(h.state.quote_items[0].unit_price,125.49);assert.equal(h.state.quotes[0].total,260.98);
 const admin=JSON.parse((await h.admin({httpMethod:'GET',queryStringParameters:{id:'q1'}})).body).quote.items[0];assert.equal(admin.unit_price,125.49);assert.equal(admin.markup_percent,30.21);
 h.state.quotes[0].status='sent';h.state.quotes[0].first_viewed_at='2026-10-21T00:00:00Z';const buyer=JSON.parse((await h.buyer({queryStringParameters:{token:'public-link'}})).body).quote.items[0];assert.equal(buyer.unit_price,125.49);assert.equal(Object.hasOwn(buyer,'manual_unit_price'),false);
});

test('chosen CRM buyer controls recipient and saved snapshot; another company contact is rejected',async()=>{
 const h=harness();h.state.yepii_leads.push({id:'lead1',deleted_at:null,company_name:'Empresa',cnpj:'123',lead_code:'CL1'});h.state.yepii_contacts.push({id:'contact2',lead_id:'lead1',full_name:'Segundo comprador',email:'segundo@example.com',phone:'21999990000'});
 const e=event({description:'Produto',quantity:1,unit_price:10});let body=JSON.parse(e.body);Object.assign(body.quote,{lead_id:'lead1',contact_id:'contact2',client_email:'segundo@example.com',valid_until:'2050-01-01'});body.action='send';e.body=JSON.stringify(body);const saved=await h.save(e);assert.equal(saved.statusCode,200,saved.body);assert.equal(h.state.quotes[0].client_email,'segundo@example.com');assert.equal(h.state.quotes[0].client_name,'Segundo comprador');assert.equal(h.state.sent[0].opts.toOverride,'segundo@example.com');
 h.state.yepii_contacts[0].email='alterado@example.com';assert.equal(h.state.quotes[0].client_email,'segundo@example.com');
 const writes=h.state.writes;e.body=JSON.stringify(body);const stale=await h.save(e);assert.equal(stale.statusCode,409,stale.body);assert.equal(h.state.writes,writes);body.quote.contact_id='belongs-to-other-company';e.body=JSON.stringify(body);const rejected=await h.save(e);assert.equal(rejected.statusCode,400,rejected.body);assert.equal(h.state.writes,writes);
});
