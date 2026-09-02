const { createClient } = require('@supabase/supabase-js');
const { sendQuoteEmail } = require('../lib/email');
const PUBLISHABLE_KEY='sb_publishable_9OnuKQOmBQR7TArHu3-X7g_HXbQpQoc';
function decodeDataUrl(dataUrl){const m=String(dataUrl||'').match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);if(!m)return null;const ext=m[1]==='image/png'?'png':m[1]==='image/webp'?'webp':'jpg';return {mime:m[1],ext,buffer:Buffer.from(m[2],'base64')}}
function money(v){const n=Number(v||0);return Number.isFinite(n)?Math.round(n*100)/100:0}
function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}}
exports.handler=async(event)=>{try{
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  const auth=(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');
  if(!auth)return json(401,{error:'Authentication required'});
  const authClient=createClient(process.env.SUPABASE_URL,PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userErr}=await authClient.auth.getUser(auth);
  if(userErr||!user)return json(401,{error:'Sessão inválida'});
  const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const body=JSON.parse(event.body||'{}'),q=body.quote||{},items=Array.isArray(q.items)?q.items:[];
  const action=body.action==='draft'?'draft':'send';
  if(!q.quote_number)throw new Error('Informe o número da cotação.');
  if(!items.length)throw new Error('Adicione pelo menos um produto.');
  if(action==='send'&&!q.valid_until)throw new Error('Informe a validade da cotação.');
  if(action==='send'&&q.valid_until<new Date().toISOString().slice(0,10))throw new Error('A validade da cotação não pode estar no passado.');
  const subtotal=items.reduce((s,i)=>s+money(i.quantity)*money(i.unit_price),0),total=money(subtotal+money(q.tax)+money(q.other_amount)+money(q.freight));
  let quoteId=body.quote_id||null,publicToken=null,shortToken=null,previousStatus=null,isNew=!quoteId;
  if(quoteId){
    const {data:existing,error:existingErr}=await supabase.from('quotes').select('status,sent_at,reminder_sent_at,reminder_2_sent_at').eq('id',quoteId).single();
    if(existingErr)throw existingErr;
    previousStatus=existing.status;
    if(previousStatus!=='draft')throw new Error('Esta cotação já foi finalizada e não pode mais ser alterada. Duplique a cotação para criar uma nova versão.');
  }
  const now=new Date().toISOString();
  const status=action==='draft'?'draft':'sent';
  const quoteRow={quote_number:q.quote_number,status,quote_date:q.quote_date||null,client_id:q.client_id||null,company:q.company||null,cnpj:q.cnpj||null,address:q.address||null,phone:q.phone||null,client_email:q.client_email||null,tax:money(q.tax),other_amount:money(q.other_amount),freight:money(q.freight),delivery_terms:q.delivery_terms||null,delivery_address:q.delivery_address||null,seller:q.seller||null,payment_terms:q.payment_terms||null,notes:q.notes||null,notify_email_1:q.notify_email_1||'cotacaodireta@yepii.com.br',notify_email_2:q.notify_email_2||null,notify_email_3:q.notify_email_3||null,notify_whatsapp:q.notify_whatsapp||null,quote_responsible:q.quote_responsible||null,internal_notes:q.internal_notes||null,subtotal:money(subtotal),total,valid_until:q.valid_until||null,terms_version:q.terms_version||null,terms_snapshot:q.terms_snapshot||null,expired_at:null,rejected_at:null,rejection_reason:null};
  if(action==='send'){
    quoteRow.sent_at=now;
    if(previousStatus==='draft'||isNew){quoteRow.reminder_sent_at=null;quoteRow.reminder_2_sent_at=null;}
  }
  if(quoteId){
    const {data,error}=await supabase.from('quotes').update(quoteRow).eq('id',quoteId).select('id,public_token,short_token,quote_number,company,notify_email_1,notify_email_2,notify_email_3,status').single();
    if(error)throw error;publicToken=data.public_token;shortToken=data.short_token;
    await supabase.from('quote_items').delete().eq('quote_id',quoteId);
  }else{
    const {data,error}=await supabase.from('quotes').insert(quoteRow).select('id,public_token,short_token,quote_number,company,notify_email_1,notify_email_2,notify_email_3,status').single();
    if(error)throw error;quoteId=data.id;publicToken=data.public_token;shortToken=data.short_token;
    await supabase.from('quote_events').insert({quote_id:quoteId,event_type:'created',event_data:{status}});
  }
  const rows=[];
  for(let idx=0;idx<items.length;idx++){
    const i=items[idx];let imageUrl=i.image_url||null;
    if(i.image_data){const dec=decodeDataUrl(i.image_data);if(dec){const path=`${quoteId}/${crypto.randomUUID()}.${dec.ext}`;const {error}=await supabase.storage.from('quote-images').upload(path,dec.buffer,{contentType:dec.mime,upsert:false});if(error)throw error;imageUrl=supabase.storage.from('quote-images').getPublicUrl(path).data.publicUrl}}
    rows.push({quote_id:quoteId,position:idx+1,description:String(i.description||'').trim(),quantity:money(i.quantity||1),unit_price:money(i.unit_price),image_url:imageUrl,selected:i.selected!==false});
  }
  const {error:itemErr}=await supabase.from('quote_items').insert(rows);if(itemErr)throw itemErr;
  await supabase.from('quote_events').insert({quote_id:quoteId,event_type:action==='draft'?'draft_saved':(previousStatus==='draft'||isNew?'sent':'updated'),event_data:{total,valid_until:q.valid_until||null}});
  let email_notification={sent:false,reason:action==='draft'?'draft':'not_first_send'};
  const firstSend=action==='send'&&(isNew||previousStatus==='draft');
  if(firstSend){
    const fullQuote={...quoteRow,id:quoteId,public_token:publicToken,short_token:shortToken};
    try{email_notification=await sendQuoteEmail(fullQuote,{headline:'Cotação criada e link gerado',message:'Uma nova cotação foi cadastrada e está pronta para ser enviada ao comprador.'});await supabase.from('quote_events').insert({quote_id:quoteId,event_type:email_notification.sent?'created_email_sent':'created_email_skipped',event_data:email_notification})}
    catch(e){email_notification={sent:false,error:e.message};await supabase.from('quote_events').insert({quote_id:quoteId,event_type:'created_email_failed',event_data:email_notification})}
  }
  return json(200,{ok:true,quote_id:quoteId,quote_number:q.quote_number,status,public_token:publicToken,short_token:shortToken,email_notification});
}catch(e){return json(500,{error:e.message||'Erro inesperado'})}};
