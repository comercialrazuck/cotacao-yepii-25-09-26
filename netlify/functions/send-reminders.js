const { createClient } = require('@supabase/supabase-js');
const { sendQuoteEmail } = require('../lib/email');

exports.handler=async()=>{
  const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY);
  const now=Date.now();
  const cutoff2=new Date(now-2*24*60*60*1000).toISOString();
  const cutoff7AfterFirst=new Date(now-7*24*60*60*1000).toISOString();
  let sentFirst=0,sentSecond=0,checkedFirst=0,checkedSecond=0;

  const {data:first,error:firstErr}=await supabase.from('quotes').select('*').in('status',['sent','viewed']).not('client_email','is',null).is('reminder_sent_at',null).lte('sent_at',cutoff2).gte('valid_until',new Date().toISOString().slice(0,10)).limit(100);
  if(firstErr)return{statusCode:500,body:JSON.stringify({error:firstErr.message})};
  checkedFirst=(first||[]).length;
  for(const q of first||[]){
    try{
      const r=await sendQuoteEmail(q,{headline:'Lembrete: sua cotação Yepii está aguardando análise',message:'Sua cotação continua disponível. Você pode revisar os itens e aceitar ou recusar pelo link abaixo.',toOverride:q.client_email,buttonLabel:'Ver minha cotação'});
      if(r.sent){
        sentFirst++;
        await supabase.from('quotes').update({reminder_sent_at:new Date().toISOString()}).eq('id',q.id);
        await supabase.from('quote_events').insert({quote_id:q.id,event_type:'buyer_reminder_2d_email_sent',event_data:r});
      }
    }catch(e){
      await supabase.from('quote_events').insert({quote_id:q.id,event_type:'buyer_reminder_2d_email_failed',event_data:{error:e.message}});
    }
  }

  const {data:second,error:secondErr}=await supabase.from('quotes').select('*').in('status',['sent','viewed']).not('client_email','is',null).not('reminder_sent_at','is',null).is('reminder_2_sent_at',null).lte('reminder_sent_at',cutoff7AfterFirst).gte('valid_until',new Date().toISOString().slice(0,10)).limit(100);
  if(secondErr)return{statusCode:500,body:JSON.stringify({error:secondErr.message})};
  checkedSecond=(second||[]).length;
  for(const q of second||[]){
    try{
      const r=await sendQuoteEmail(q,{headline:'Último lembrete: cotação Yepii pendente',message:'Sua cotação ainda está disponível para análise. Este é um novo lembrete enviado 7 dias após o primeiro.',toOverride:q.client_email,buttonLabel:'Revisar cotação'});
      if(r.sent){
        sentSecond++;
        await supabase.from('quotes').update({reminder_2_sent_at:new Date().toISOString()}).eq('id',q.id);
        await supabase.from('quote_events').insert({quote_id:q.id,event_type:'buyer_reminder_9d_email_sent',event_data:r});
      }
    }catch(e){
      await supabase.from('quote_events').insert({quote_id:q.id,event_type:'buyer_reminder_9d_email_failed',event_data:{error:e.message}});
    }
  }

  return{statusCode:200,body:JSON.stringify({ok:true,first:{checked:checkedFirst,sent:sentFirst},second:{checked:checkedSecond,sent:sentSecond}})};
};
exports.config={schedule:'0 12 * * *'};
