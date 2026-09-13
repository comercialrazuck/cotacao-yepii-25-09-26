const { getActor } = require('../lib/auth');
function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'https://crm.yepii.com.br','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, OPTIONS'},body:JSON.stringify(body)}}
exports.handler=async(event)=>{try{
 if(event.httpMethod==='OPTIONS')return json(204,{});
 if(event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});
 const actor=await getActor(event);if(!actor)return json(401,{error:'Sessão inválida'});
 const leadId=String(event.queryStringParameters?.lead_id||'').trim();if(!leadId)return json(400,{error:'lead_id obrigatório'});
 const {supabase}=actor;
 const {data:quotes,error}=await supabase.from('quotes').select('id,quote_number,status,quote_date,valid_until,total,client_email,public_token,short_token,accepted_at,created_at').eq('lead_id',leadId).order('created_at',{ascending:false});
 if(error)throw error;
 const ids=(quotes||[]).map(q=>q.id);let orders=[];
 if(ids.length){const r=await supabase.from('yepii_orders').select('id,quote_id,order_number,payment_status,order_value').in('quote_id',ids);if(!r.error)orders=r.data||[];}
 const orderMap=new Map(orders.map(o=>[o.quote_id,o]));
 const rows=(quotes||[]).map(q=>({...q,order:orderMap.get(q.id)||null}));
 return json(200,{quotes:rows});
}catch(e){return json(500,{error:e.message||'Erro inesperado'})}};