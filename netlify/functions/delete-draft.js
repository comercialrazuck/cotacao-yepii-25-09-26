const { createClient } = require('@supabase/supabase-js');
const PUBLISHABLE_KEY='sb_publishable_9OnuKQOmBQR7TArHu3-X7g_HXbQpQoc';
function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}}
exports.handler=async(event)=>{try{
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  const token=String(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');
  if(!token)return json(401,{error:'Authentication required'});
  const authClient=createClient(process.env.SUPABASE_URL,PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userErr}=await authClient.auth.getUser(token);if(userErr||!user)return json(401,{error:'Sessão inválida'});
  const body=JSON.parse(event.body||'{}'),id=body.quote_id;if(!id)return json(400,{error:'Cotação inválida'});
  const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:q,error:qErr}=await supabase.from('quotes').select('id,status').eq('id',id).single();if(qErr)throw qErr;
  if(q.status!=='draft')return json(409,{error:'Somente rascunhos podem ser excluídos.'});
  await supabase.from('quote_items').delete().eq('quote_id',id);
  await supabase.from('quote_events').delete().eq('quote_id',id);
  const {error:dErr}=await supabase.from('quotes').delete().eq('id',id).eq('status','draft');if(dErr)throw dErr;
  return json(200,{ok:true});
}catch(e){return json(500,{error:e.message||'Erro inesperado'})}};
