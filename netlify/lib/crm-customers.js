const {buyerEmails}=require('./buyer-recipients');
const CONTACT_COLUMNS='id,full_name,job_title,phone,whatsapp,email,is_primary';
const emailPattern=/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
function fail(message,statusCode=400){throw Object.assign(new Error(message),{statusCode})}
function searchFilter(value){const term=String(value||'').trim().replace(/[^\p{L}\p{N} &'-]/gu,' ').replace(/\s+/g,' ').slice(0,100);const digits=String(value||'').replace(/\D/g,'');if(term.length<2)return null;const filters=[`company_name.ilike.*${term}*`,`trade_name.ilike.*${term}*`];if(digits.length>=2){filters.push(`cnpj.ilike.*${digits}*`);const mask=digits.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2}\.\d{3})(\d)/,'$1.$2').replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/,'$1/$2').replace(/(\/\d{4})(\d)/,'$1-$2');if(mask!==digits)filters.push(`cnpj.ilike.*${mask}*`)}return filters.join(',')}
async function activeLead(supabase,id){const {data,error}=await supabase.from('yepii_leads').select('*').eq('id',id).is('deleted_at',null).maybeSingle();if(error)throw error;if(!data)fail('Empresa não encontrada ou inativa no CRM.',404);return data}
function validateContact(body){const full_name=String(body.full_name||'').trim(),email=String(body.email||'').trim().toLowerCase(),job_title=String(body.job_title||'').trim(),phone=String(body.phone||'').trim();if(!full_name||full_name.length>200)fail('Informe o nome do comprador (até 200 caracteres).');if(email.length>254||!emailPattern.test(email))fail('Informe um e-mail válido para o comprador.');if(job_title.length>200||phone.length>40)fail('Cargo ou telefone ultrapassa o tamanho permitido.');return {full_name,email,job_title:job_title||null,phone:phone||null}}
async function resolveRecipient(supabase,q){
 const emails=buyerEmails(q.client_email);
 const ids=[...new Set(Array.isArray(q.contact_ids)?q.contact_ids.filter(Boolean):q.contact_id?[q.contact_id]:[])];
 if(ids.length>50)fail('Selecione no máximo 50 compradores.');
 if(ids.length&&!q.lead_id)fail('Selecione a empresa do CRM antes de escolher os compradores.');
 const selected=[];
 for(const id of ids){
  const {data,error}=await supabase.from('yepii_contacts').select(CONTACT_COLUMNS).eq('id',id).eq('lead_id',q.lead_id).maybeSingle();if(error)throw error;
  if(!data||!emailPattern.test(String(data.email||'').trim()))fail('Comprador não encontrado nesta empresa ou sem e-mail válido. Atualize a lista.');
  if(!emails.includes(data.email.trim().toLowerCase()))fail('O e-mail deste comprador mudou no CRM. Atualize a lista e selecione o contato novamente.',409);
  selected.push(data);
 }
 if(selected.length){q.client_name=selected[0].full_name||'';q.phone=selected[0].whatsapp||selected[0].phone||'';}
 q.contact_ids=ids;q.client_email=emails.join(', ');return emails;
}
module.exports={CONTACT_COLUMNS,emailPattern,fail,searchFilter,activeLead,validateContact,resolveRecipient};
