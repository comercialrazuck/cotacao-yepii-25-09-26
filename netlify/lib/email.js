const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function recipients(q){return [...new Set([q.notify_email_1,q.notify_email_2,q.notify_email_3].filter(Boolean).map(x=>String(x).trim()).filter(Boolean))]}
function quoteSubject(q){return `${q.company||'Cliente'} — Cotação ${q.quote_number||''}`.trim()}
function clientLink(q){const base=(process.env.PUBLIC_SITE_URL||'https://cotacaoyepii.com.br').replace(/\/+$/,'');const suffix=String(q.short_token||'').slice(0,6).toUpperCase();return suffix?`${base}/c/${encodeURIComponent(q.quote_number)}-${suffix}`:`${base}/?q=${encodeURIComponent(q.public_token||'')}`}
function fmtDate(v){if(!v)return '-';if(/^\d{4}-\d{2}-\d{2}$/.test(v)){const [y,m,d]=v.split('-');return `${d}/${m}/${y}`}const d=new Date(v);return Number.isNaN(d.getTime())?'-':d.toLocaleDateString('pt-BR')}
function brandHeader(){const logo=process.env.YEPII_LOGO_URL||'';return logo?`<div style="margin:0 0 22px"><img src="${esc(logo)}" alt="Yepii" style="display:block;max-width:150px;height:auto"></div>`:`<div style="font-size:28px;font-weight:800;font-style:italic;color:#ff6600;margin:0 0 22px">Yepii</div>`}
function signature(){const sig=process.env.YEPII_EMAIL_SIGNATURE_URL||'';if(sig)return `<div style="margin-top:30px;padding-top:18px;border-top:1px solid #eee"><img src="${esc(sig)}" alt="Equipe Yepii" style="display:block;max-width:520px;width:100%;height:auto"></div>`;return `<div style="margin-top:30px;padding-top:18px;border-top:1px solid #eee;font-size:13px;color:#555"><strong>Equipe Yepii</strong><br>Somos Imparáveis, Somos Yepii!<br>21 95928-6836 · comercial@yepii.com.br</div>`}
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
