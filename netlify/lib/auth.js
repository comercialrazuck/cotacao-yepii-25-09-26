const { createClient } = require('@supabase/supabase-js');

const PUBLISHABLE_KEY='sb_publishable_9OnuKQOmBQR7TArHu3-X7g_HXbQpQoc';
const WRITE_ROLES=new Set(['administrador','comercial']);
const READ_ALL_ROLES=new Set(['administrador','gestor_comercial','visualizacao']);
const REPORT_ROLES=new Set(['administrador','gestor_comercial','visualizacao','comercial']);

function serviceClient(){return createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}})}
async function getActor(event){
  const token=String(event.headers?.authorization||event.headers?.Authorization||'').replace(/^Bearer\s+/i,'');
  if(!token)return null;
  const authClient=createClient(process.env.SUPABASE_URL,PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await authClient.auth.getUser(token);
  if(error||!user)return null;
  const supabase=serviceClient();
  const {data:member,error:memberErr}=await supabase.from('yepii_team_members').select('user_id,full_name,email,role,active').eq('user_id',user.id).maybeSingle();
  if(memberErr||!member||member.active!==true)return null;
  return {user,member,supabase,token};
}
function canWriteQuotes(actor){return !!actor&&WRITE_ROLES.has(actor.member.role)}
function canReadAllQuotes(actor){return !!actor&&READ_ALL_ROLES.has(actor.member.role)}
function canReadReports(actor){return !!actor&&REPORT_ROLES.has(actor.member.role)}
function canManageUsers(actor){return !!actor&&actor.member.role==='administrador'}
async function canAccessQuote(actor,quote){if(!actor||!quote)return false;if(canReadAllQuotes(actor))return true;if(actor.member.role==='comercial')return quote.created_by===actor.user.id;return false}
module.exports={getActor,serviceClient,canWriteQuotes,canReadAllQuotes,canReadReports,canManageUsers,canAccessQuote};
