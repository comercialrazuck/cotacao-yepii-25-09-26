const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const PROD_BASE='https://cotacaoyepii.com.br';
const LOGO_URL='https://raw.githubusercontent.com/comercialrazuck/cotacao-yepii-25-09-26/a4f21a40a45dae0478076d89a70a25cc90f4c145/assets/yepii-logo.png';
const SIGNATURE_URL='https://raw.githubusercontent.com/comercialrazuck/cotacao-yepii-25-09-26/a4f21a40a45dae0478076d89a70a25cc90f4c145/assets/yepii-email-signature.png';
function recipients(q){return [...new Set([q.notify_email_1,q.notify_email_2,q.notify_email_3].filter(Boolean).map(x=>String(x).trim()).filter(Boolean))]}
function quoteSubject(q){return `${q.company||'Cliente'} — Cotação ${q.quote_number||''}`.trim()}
function siteBase(){return PROD_BASE}
function clientLink(q){const base=siteBase();const suffix=String(q.short_token||'').slice(0,6).toUpperCase();return suffix?`${base}/c/${encodeURIComponent(q.quote_number)}-${suffix}`:`${base}/?q=${encodeURIComponent(q.public_token||'')}`}
function fmtDate(v){if(!v)return '-';if(/^\d{4}-\d{2}-\d{2}$/.test(v)){const [y,m,d]=v.split('-');return `${d}/${m}/${y}`}const d=new Date(v);return Number.isNaN(d.getTime())?'-':d.toLocaleDateString('pt-BR')}
function brandHeader(){return `<div style="margin:0 0 22px"><img src="${esc(LOGO_URL)}" alt="Yepii" width="150" style="display:block;width:150px;max-width:150px;height:auto;border:0;outline:none;text-decoration:none"></div>`}
function signature(){return `<div style="margin-top:30px;padding-top:18px;border-top:1px solid #eee"><img src="${esc(SIGNATURE_URL)}" alt="Equipe Yepii" width="400" style="display:block;width:400px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none"></div>`}
async function sendQuoteEmail(q,{headline,message,detailsHtml='',toOverride=null,buttonLabel='Ver minha cotação',subjectOverride=null,includeButton=true}){
  const key=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM_EMAIL;
  const to=toOverride?[...new Set((Array.isArray(toOverride)?toOverride:[toOverride]).filter(Boolean).map(x=>String(x).trim()).filter(Boolean))]:recipients(q);
  if(!key||!from||!to.length)return {sent:false,reason:'not_configured_or_no_recipient'};
  const link=clientLink(q),subject=subjectOverride||quoteSubject(q);
  const button=includeButton?`<p style="margin:26px 0"><a href="${esc(link)}" style="display:inline-block;background:#ff6600;color:#fff;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:700">${esc(buttonLabel)}</a></p>`:'';
  const html=`<div style="font-family:Arial,sans-serif;color:#242424;max-width:720px;margin:auto;line-height:1.55">${brandHeader()}<h2 style="margin:0 0 14px;color:#242424">${esc(headline)}</h2><p>${esc(message)}</p><p><strong>Empresa:</strong> ${esc(q.company||'-')}<br><strong>Cotação:</strong> ${esc(q.quote_number||'-')}${q.valid_until?`<br><strong>Validade:</strong> ${esc(fmtDate(q.valid_until))}`:''}</p>${detailsHtml}${button}${includeButton?`<p style="font-size:12px;color:#777;margin-top:20px;word-break:break-all">Link: ${esc(link)}</p>`:''}${signature()}</div>`;
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to,subject,html})});
  const payload=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`Resend ${r.status}: ${JSON.stringify(payload)}`);
  return {sent:true,to,id:payload.id||null,subject};
}
async function recordQuoteEmail(supabase,q,result,emailType,recipient){if(!result?.sent||!result.id||!q?.id)return;await supabase.from('quote_emails').insert({quote_id:q.id,resend_email_id:result.id,email_type:emailType,recipient:String(recipient||result.to?.[0]||''),subject:result.subject||null,sent_at:new Date().toISOString(),last_event:'email.sent'})}
module.exports={esc,recipients,quoteSubject,clientLink,sendQuoteEmail,recordQuoteEmail,fmtDate};
