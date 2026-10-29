const EMAIL=/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
function buyerEmails(value,{required=false}={}){
 const input=Array.isArray(value)?value:[value??''];
 const emails=[...new Set(input.flatMap(v=>String(v??'').split(/[,;]/)).map(v=>v.trim().toLowerCase()).filter(Boolean))];
 if(emails.length>50)throw Object.assign(new Error('Selecione no máximo 50 e-mails de compradores.'),{statusCode:400});
 if(emails.some(email=>email.length>254||!EMAIL.test(email)))throw Object.assign(new Error('Informe e-mails válidos, separados por vírgula.'),{statusCode:400});
 if(required&&!emails.length)throw Object.assign(new Error('Selecione pelo menos um e-mail de comprador.'),{statusCode:400});
 return emails;
}
module.exports={buyerEmails};
