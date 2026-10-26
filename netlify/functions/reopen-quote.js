const {getActor}=require('../lib/auth');
const {canReopenQuote}=require('../lib/quote-reopening');
const COPY_FIELDS='lead_id client_id client_name company cnpj address phone client_email tax other_amount freight delivery_terms delivery_address seller payment_terms notes notify_email_1 notify_email_2 notify_email_3 notify_whatsapp quote_responsible internal_notes subtotal total terms_version terms_snapshot'.split(' ');
const ITEM_FIELDS='position description quantity unit_price image_url supplier_name unit_cost markup_percent'.split(' ');
const pick=(row,fields)=>Object.fromEntries(fields.map(key=>[key,row[key]??null]));
const json=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
exports.handler=async event=>{
 try{
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  const actor=await getActor(event);if(!actor)return json(401,{error:'Sessão inválida'});
  let body;try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Solicitação inválida'})}
  if(!body.quote_id)return json(400,{error:'Informe a cotação.'});
  const {supabase,user}=actor;
  const {data:q,error}=await supabase.from('quotes').select('*').eq('id',body.quote_id).maybeSingle();if(error)throw error;if(!q)return json(404,{error:'Cotação não encontrada.'});
  if(!await canReopenQuote(actor,q))return json(403,{error:'Seu perfil não pode reabrir esta cotação ou ela não está expirada, recusada ou aceita.'});
  if(body.expected_status!==q.status)return json(409,{error:'O status da cotação mudou. Atualize a página e tente novamente.'});
  const {data:items,error:itemsError}=await supabase.from('quote_items').select('*').eq('quote_id',q.id).order('position');if(itemsError)throw itemsError;if(!items?.length)return json(409,{error:'A cotação não contém produtos.'});
  const now=new Date().toISOString();
  if(q.status==='accepted'){
   // The accepted quote and its CRM order remain immutable. A fresh draft needs a new acceptance.
   const {data:number,error:numberError}=await supabase.rpc('get_next_quote_number');if(numberError)throw numberError;
   const {data:revision,error:revisionError}=await supabase.from('quotes').insert({...pick(q,COPY_FIELDS),quote_number:number,status:'draft',quote_date:now.slice(0,10),valid_until:null,created_by:user.id}).select('*').single();if(revisionError)throw revisionError;
   try{
    const {error:copyError}=await supabase.from('quote_items').insert(items.map(item=>({...pick(item,ITEM_FIELDS),quote_id:revision.id,selected:true})));if(copyError)throw copyError;
    const {error:historyError}=await supabase.from('quote_events').insert([
     {quote_id:revision.id,event_type:'updated',event_data:{action:'revision_created',source_quote_id:q.id,source_quote_number:q.quote_number,previous_status:q.status,reopened_by:user.id}},
     {quote_id:q.id,event_type:'updated',event_data:{action:'revision_requested',revision_quote_id:revision.id,revision_quote_number:number,reopened_by:user.id}}
    ]);if(historyError)throw historyError;
   }catch(copyError){await supabase.from('quotes').delete().eq('id',revision.id).eq('status','draft');throw copyError}
   return json(200,{ok:true,quote_id:revision.id,status:'draft',mode:'revision',source_quote_number:q.quote_number});
  }
  // Persist the previous document before reopening. A failed attempt remains distinguishable in history.
  const {error:snapshotError}=await supabase.from('quote_events').insert({quote_id:q.id,event_type:'updated',event_data:{action:'reopen_requested',reopened_by:user.id,previous_status:q.status,snapshot:{quote:q,items}}});if(snapshotError)throw snapshotError;
  const {data:updated,error:updateError}=await supabase.from('quotes').update({status:'draft',valid_until:null,expired_at:null,rejected_at:null,rejection_reason:null,accepted_at:null,first_viewed_at:null,reminder_sent_at:null,reminder_2_sent_at:null}).eq('id',q.id).eq('status',q.status).select('id').maybeSingle();if(updateError)throw updateError;if(!updated)return json(409,{error:'A cotação mudou durante a reabertura. Atualize a página.'});
  const {error:historyError}=await supabase.from('quote_events').insert({quote_id:q.id,event_type:'updated',event_data:{action:'reopened',reopened_by:user.id,previous_status:q.status}});
  return json(200,{ok:true,quote_id:q.id,status:'draft',mode:'reopened',history_warning:!!historyError});
 }catch(error){return json(500,{error:error.message||'Não foi possível reabrir a cotação.'})}
};
