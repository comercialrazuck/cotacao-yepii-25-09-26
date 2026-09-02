const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function recipients(q){return [...new Set([q.notify_email_1,q.notify_email_2,q.notify_email_3].filter(Boolean).map(x=>String(x).trim()).filter(Boolean))]}
function quoteSubject(q){return `${q.company||'Cliente'} — Cotação ${q.quote_number||''}`.trim()}
function clientLink(q){
  const base=(process.env.PUBLIC_SITE_URL||'https://cotacaoyepii.com.br').replace(/\/+$/,'');
  const suffix=String(q.short_token||'').slice(0,6).toUpperCase();
  return suffix?`${base}/c/${encodeURIComponent(q.quote_number)}-${suffix}`:`${base}/?q=${encodeURIComponent(q.public_token||'')}`;
}
async function sendQuoteEmail(q,{headline,message,detailsHtml='',toOverride=null,buttonLabel='Abrir cotação'}){
  const key=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM_EMAIL;
  const to=toOverride ? [...new Set((Array.isArray(toOverride)?toOverride:[toOverride]).filter(Boolean).map(x=>String(x).trim()).filter(Boolean))] : recipients(q);
  if(!key||!from||!to.length)return {sent:false,reason:'not_configured_or_no_recipient'};
  const link=clientLink(q);
  const html=`<div style="font-family:Arial,sans-serif;color:#242424;max-width:720px;margin:auto"><div style="font-size:28px;font-weight:800;color:#ff6600;margin-bottom:18px">Yepii</div><h2 style="margin:0 0 14px">${esc(headline)}</h2><p>${esc(message)}</p><p><strong>Empresa:</strong> ${esc(q.company||'-')}<br><strong>Cotação:</strong> ${esc(q.quote_number||'-')}</p>${detailsHtml}<p style="margin-top:24px"><a href="${esc(link)}" style="display:inline-block;background:#ff6600;color:white;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">${esc(buttonLabel)}</a></p><p style="font-size:12px;color:#777;margin-top:24px">Link: ${esc(link)}</p></div>`;
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to,subject:quoteSubject(q),html})});
  if(!r.ok)throw new Error(`Resend ${r.status}: ${await r.text()}`);
  return {sent:true,to};
}
module.exports={esc,recipients,quoteSubject,clientLink,sendQuoteEmail};
