const {getActor,canWriteQuotes}=require('../lib/auth');
const {CONTACT_COLUMNS,searchFilter,activeLead,validateContact}=require('../lib/crm-customers');
const json=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
exports.handler=async event=>{try{
 if(!['GET','POST'].includes(event.httpMethod))return json(405,{error:'Método não permitido.'});
 const actor=await getActor(event);if(!actor)return json(401,{error:'Sessão inválida.'});const {supabase}=actor;
 if(event.httpMethod==='GET'){const filter=searchFilter(event.queryStringParameters?.q);if(!filter)return json(200,{companies:[]});const {data,error}=await supabase.from('yepii_leads').select('id,lead_code,company_name,trade_name,cnpj,city,state').is('deleted_at',null).or(filter).order('company_name').limit(20);if(error)throw error;return json(200,{companies:data||[]})}
 if(!canWriteQuotes(actor))return json(403,{error:'Seu perfil é somente leitura.'});
 const body=JSON.parse(event.body||'{}');if(!body.lead_id)return json(400,{error:'Selecione a empresa do CRM.'});await activeLead(supabase,body.lead_id);const input=validateContact(body);
 const existing=await supabase.from('yepii_contacts').select(CONTACT_COLUMNS).eq('lead_id',body.lead_id).ilike('email',input.email.replace(/[%_\\]/g,'\\$&')).limit(1).maybeSingle();if(existing.error)throw existing.error;if(existing.data)return json(200,{contact:existing.data,existing:true});
 const {data,error}=await supabase.from('yepii_contacts').insert({...input,lead_id:body.lead_id,is_primary:false,created_by:actor.user.id}).select(CONTACT_COLUMNS).single();if(error)throw error;return json(201,{contact:data,existing:false});
 }catch(e){return json(e.statusCode||500,{error:e.message||'Não foi possível consultar o CRM.'})}};
