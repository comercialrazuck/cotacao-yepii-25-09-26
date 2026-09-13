const { getActor } = require('../lib/auth');
function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'https://crm.yepii.com.br','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, OPTIONS'},body:JSON.stringify(body)}}
function addr(l){return [l.street,l.street_number,l.address_complement,l.neighborhood,l.city,l.state,l.postal_code].filter(Boolean).join(', ')}
exports.handler=async(event)=>{try{
 if(event.httpMethod==='OPTIONS')return json(204,{});
 if(event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});
 const actor=await getActor(event);if(!actor)return json(401,{error:'Sessão inválida'});
 const leadId=String(event.queryStringParameters?.lead_id||'').trim();if(!leadId)return json(400,{error:'lead_id obrigatório'});
 const {supabase}=actor;
 const {data:lead,error}=await supabase.from('yepii_leads').select('id,lead_code,company_name,trade_name,cnpj,street,street_number,address_complement,neighborhood,city,state,postal_code').eq('id',leadId).is('deleted_at',null).maybeSingle();
 if(error)throw error;if(!lead)return json(404,{error:'Cliente não encontrado no CRM'});
 const {data:contacts,error:contactErr}=await supabase.from('yepii_contacts').select('full_name,phone,whatsapp,email,is_primary,created_at').eq('lead_id',leadId).order('is_primary',{ascending:false}).order('created_at',{ascending:true});
 if(contactErr)throw contactErr;const contact=(contacts||[])[0]||{};
 return json(200,{lead:{lead_id:lead.id,client_id:lead.lead_code||'',company:lead.company_name||lead.trade_name||'',cnpj:lead.cnpj||'',address:addr(lead),delivery_address:addr(lead),client_name:contact.full_name||'',phone:contact.whatsapp||contact.phone||'',client_email:contact.email||''}});
}catch(e){return json(500,{error:e.message||'Erro inesperado'})}};