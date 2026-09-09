const fs=require('fs');
const path=require('path');

function applyBrandingAndUi(source){
  let html=source;
  const logo='https://raw.githubusercontent.com/comercialrazuck/cotacao-yepii-25-09-26/9978cd6410b6f64a3a808709c06080c98c4f4e9b/assets/yepii-logo.png';
  html=html.replace(/<div class="logo">Yepii<\/div>/g,`<img class="official-yepii-logo" src="${logo}" alt="Yepii">`);
  html=html.replace(/<div class="logo" style="font-size:28px">Yepii<\/div>/g,`<img class="official-yepii-logo footer-yepii-logo" src="${logo}" alt="Yepii">`);
  html=html.replace(/<div class="receipt-logo">Yepii<\/div>/g,`<div class="receipt-logo"><img src="${logo}" alt="Yepii" class="receipt-logo-img"></div>`);
  html=html.replace('</style>',`.official-yepii-logo{display:block;width:150px;max-width:100%;height:auto;object-fit:contain}.footer-yepii-logo{width:105px}.receipt-logo-img{display:block;width:120px;height:auto;object-fit:contain}.client-print-row{display:flex;justify-content:flex-end;margin:0 0 14px}.client-print-btn{display:inline-flex!important;align-items:center;gap:8px}.client-view .client-print-row{display:flex!important}.client-view .top{align-items:flex-start}.client-view .official-yepii-logo{width:150px}.client-view .wordmark{display:flex;align-items:center;gap:16px}.client-view .tag{padding-left:18px;border-left:1px solid #D7D7DA}.client-view .meta{display:grid}@media(max-width:640px){.official-yepii-logo{width:130px}.client-view .wordmark{flex-direction:column;align-items:flex-start;gap:8px}.client-view .tag{border-left:0;padding-left:0}}@media print{.receipt-logo-img{width:110px!important;height:auto!important}.client-print-row{display:none!important}}\n</style>`);
  html=html.replace('<div class="field"><label>Empresa:</label><input id="company" class="editable"></div>','<div class="field"><label>Empresa:</label><input id="company" class="editable"></div><div class="field"><label>Nome do comprador / contato:</label><input id="clientName" class="editable" placeholder="Nome para personalizar o e-mail"></div>');
  html=html.replace('<button id="historyBtn" type="button" class="btn muted"><i class="fa-solid fa-clock-rotate-left"></i> Histórico</button>','<button id="historyBtn" type="button" class="btn muted"><i class="fa-solid fa-clock-rotate-left"></i> Histórico</button><a href="/relatorios" class="btn muted" style="text-decoration:none"><i class="fa-solid fa-chart-line"></i> Relatórios</a>');
  html=html.replace('<div class="terms">','<div class="client-print-row"><button id="clientPrintQuoteBtn" type="button" class="btn muted client-print-btn"><i class="fa-solid fa-print"></i> Imprimir cotação para aprovação</button></div><div class="terms">');
  html=html.replace("client_id:$('clientId').value,cnpj:","client_id:$('clientId').value,client_name:$('clientName').value,cnpj:");
  html=html.replace("$('clientId').value=q.client_id||'';$('cnpj').value", "$('clientId').value=q.client_id||'';$('clientName').value=q.client_name||'';$('cnpj').value");
  html=html.replace("['clientId','cnpj','company'", "['clientId','clientName','cnpj','company'");
  html=html.replace("buyer_reminder_9d_email_failed:'Falha no 2º lembrete'};", "buyer_reminder_9d_email_failed:'Falha no 2º lembrete',buyer_initial_email_sent:'E-mail enviado ao comprador',buyer_initial_email_skipped:'E-mail do comprador não enviado',buyer_initial_email_failed:'Falha no e-mail do comprador',buyer_email_delivered:'E-mail entregue',buyer_email_opened:'E-mail aberto',buyer_email_clicked:'Link do e-mail clicado',buyer_email_bounced:'E-mail devolvido',buyer_email_failed:'Falha na entrega do e-mail',email_delivery_delayed:'Entrega do e-mail atrasada',email_complained:'E-mail marcado como spam'};");
  const oldStatus="$('status').textContent=action==='draft'?'Rascunho salvo com sucesso.':(d.email_notification?.sent?'Cotação salva e aviso interno enviado por e-mail.':'Cotação salva e link gerado. O aviso por e-mail ainda não foi enviado; confirme a configuração do Resend.');";
  const newStatus="$('status').textContent=action==='draft'?'Rascunho salvo com sucesso.':(d.buyer_email?.sent?'Cotação finalizada e enviada ao comprador por e-mail.':'Cotação finalizada e link gerado, mas o e-mail do comprador não foi confirmado. Consulte a timeline.');";
  html=html.replace(oldStatus,newStatus);
  const forceClientUi=`<script>(function(){function ensureBuyerUi(){if(!location.pathname.startsWith('/c/'))return;document.body.classList.add('client-view');var word=document.querySelector('.wordmark');if(word){var old=word.querySelector('.logo');if(old){var img=document.createElement('img');img.className='official-yepii-logo';img.alt='Yepii';img.src='${logo}';old.replaceWith(img)}else if(!word.querySelector('.official-yepii-logo')){var img2=document.createElement('img');img2.className='official-yepii-logo';img2.alt='Yepii';img2.src='${logo}';word.prepend(img2)}}var btn=document.getElementById('clientPrintQuoteBtn');if(btn&&!btn.dataset.bound){btn.dataset.bound='1';btn.addEventListener('click',function(){window.print()})}}document.addEventListener('DOMContentLoaded',ensureBuyerUi);setTimeout(ensureBuyerUi,300);setTimeout(ensureBuyerUi,1200)})();</script>`;
  html=html.replace('</body>',forceClientUi+'</body>');
  return html;
}

exports.handler=async()=>{
  try{
    const file=path.resolve(__dirname,'../../index.html');
    const source=fs.readFileSync(file,'utf8');
    const html=applyBrandingAndUi(source);
    return {statusCode:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'},body:html};
  }catch(e){return{statusCode:500,headers:{'Content-Type':'text/plain; charset=utf-8'},body:'Não foi possível carregar a página de cotação: '+e.message}}
};
