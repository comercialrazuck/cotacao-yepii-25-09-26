const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../integrations/crm/index.html'),'utf8');
const source=html.slice(html.indexOf('function fiscalRegistrationValues('),html.indexOf('function companyTypeForm('));
function harness(mode='success',role='administrador'){
 const l={id:'l1',company_name:'Empresa',cnpj:'123',state_registration:'old'},elements={'#saveCompanyFiscal':{disabled:false},'#companyFiscalMessage':{},'#companyIcmsStatus':{value:'contribuinte'},'#companyStateRegistration':{value:' 001.234.567 '},'#companyMunicipalRegistration':{value:' 000456 '}};
 const d={querySelector:key=>elements[key]||null},writes=[];
 const ctx={role,esc:s=>String(s??'').replace(/</g,'&lt;').replace(/"/g,'&quot;'),cache:{leads:[l]},supabase:{from(table){assert.equal(table,'yepii_leads');let row;const q={update(value){row=value;return q},eq(key,id){assert.equal(key,'id');assert.equal(id,'l1');return q},select(){return q},maybeSingle:async()=>{writes.push(row);return {data:mode==='empty'?null:{id:'l1',...row},error:mode==='error'?{message:'Bloqueado'}:null}}};return q}}};vm.createContext(ctx);vm.runInContext(source,ctx);return {ctx,l,d,elements,writes};
}
test('fiscal registration values preserve leading zeros and distinguish all statuses from unknown',()=>{
 const h=harness();for(const status of ['contribuinte','isento','nao_contribuinte']){const r=h.ctx.fiscalRegistrationValues(status,'001.002.003','00007');assert.equal(r.icms_taxpayer_status,status);assert.equal(r.state_registration,'001.002.003');assert.equal(r.municipal_registration,'00007')}
 assert.equal(h.ctx.fiscalRegistrationValues('','','').icms_taxpayer_status,null);assert.throws(()=>h.ctx.fiscalRegistrationValues('outro','',''));assert.throws(()=>h.ctx.fiscalRegistrationValues('','1'.repeat(51),''));
});
test('saving edits only company fiscal fields and refreshes the cached record for reopening',async()=>{
 const h=harness();h.ctx.bindCompanyFiscalForm('l1',h.l,h.d);await h.elements['#saveCompanyFiscal'].onclick();assert.deepEqual(JSON.parse(JSON.stringify(h.writes[0])),{icms_taxpayer_status:'contribuinte',state_registration:'001.234.567',municipal_registration:'000456'});assert.equal(h.l.company_name,'Empresa');assert.equal(h.l.state_registration,'001.234.567');assert.equal(h.l.municipal_registration,'000456');assert.match(h.ctx.companyFiscalHtml(h.l),/value="001.234.567"/);assert.match(h.elements['#companyFiscalMessage'].textContent,/salvos com sucesso/);
});
test('server permission or missing-row failures do not report a successful save or overwrite cached fields',async()=>{
 for(const mode of ['empty','error']){const h=harness(mode);h.ctx.bindCompanyFiscalForm('l1',h.l,h.d);await h.elements['#saveCompanyFiscal'].onclick();assert.match(h.elements['#companyFiscalMessage'].textContent,/Erro ao salvar/);assert.equal(h.l.state_registration,'old');assert.equal(h.elements['#saveCompanyFiscal'].disabled,false)}
});
test('read-only users see fiscal fields without the save control; stored text is escaped',()=>{
 const h=harness('success','visualizacao'),markup=h.ctx.companyFiscalHtml({state_registration:'<img src=x>'});assert.equal(markup.includes('id="saveCompanyFiscal"'),false);assert.ok(markup.includes('readonly'));assert.ok(markup.includes('&lt;img'));assert.equal(markup.includes('value="<img'),false);
});
