const {getActor,canReadAllQuotes}=require('../lib/auth');
function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'https://crm.yepii.com.br','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, OPTIONS'},body:JSON.stringify(body)}}
exports.handler=async event=>{try{
 if(event.httpMethod==='OPTIONS')return json(204,{});
 if(event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});
 const actor=await getActor(event);if(!actor)return json(401,{error:'Sessão inválida'});
 if(!canReadAllQuotes(actor)&&actor.member.role!=='comercial')return json(403,{error:'Sem permissão para consultar cotações.'});
 const leadId=String(event.queryStringParameters?.lead_id||'').trim();if(!leadId)return json(400,{error:'lead_id obrigatório'});
 const {supabase}=actor;
 const {data:lead,error:leadError}=await supabase.from('yepii_leads').select('id,cnpj').eq('id',leadId).is('deleted_at',null).maybeSingle();if(leadError)throw leadError;if(!lead)return json(404,{error:'Empresa não encontrada.'});
 const columns='id,quote_number,status,quote_date,valid_until,total,client_name,client_email,public_token,short_token,accepted_at,sent_at,created_at,created_by';
 const scoped=query=>canReadAllQuotes(actor)?query:query.eq('created_by',actor.user.id);
 const {data:linked,error}=await scoped(supabase.from('quotes').select(columns).eq('lead_id',leadId).order('created_at',{ascending:false}));if(error)throw error;
 let legacy=[];const digits=String(lead.cnpj||'').replace(/\D/g,'');
 if(digits.length===14){
  const masked=digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5');
  const aliases=[...new Set([digits,masked,String(lead.cnpj).trim()])];
  const {data,error:legacyError}=await scoped(supabase.from('quotes').select(columns).is('lead_id',null).in('cnpj',aliases).order('created_at',{ascending:false}));if(legacyError)throw legacyError;legacy=data||[];
 }
 const quotes=[...new Map([...(linked||[]),...legacy].map(q=>[q.id,q])).values()].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
 // Reflect overdue proposals immediately, without writing during a history read.
 const today=new Date().toISOString().slice(0,10);
 const current=(quotes||[]).map(q=>({...q,status:['sent','viewed'].includes(q.status)&&q.valid_until&&q.valid_until<today?'expired':q.status}));
 const ids=current.map(q=>q.id);let orders=[];
 if(ids.length){const r=await supabase.from('yepii_orders').select('id,quote_id,order_number,payment_status,order_value').in('quote_id',ids);if(r.error)throw r.error;orders=r.data||[]}
 const orderMap=new Map(orders.map(o=>[o.quote_id,o]));
 return json(200,{quotes:current.map(q=>({...q,order:orderMap.get(q.id)||null}))});
}catch(e){return json(500,{error:e.message||'Erro inesperado'})}};
