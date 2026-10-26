const {canWriteQuotes,canAccessQuote}=require('./auth');
function reopenableStatus(q){return ['expired','rejected','accepted'].includes(q?.status)||(['sent','viewed'].includes(q?.status)&&q.valid_until&&q.valid_until<new Date().toISOString().slice(0,10))}
async function canReopenQuote(actor,q){return canWriteQuotes(actor)&&reopenableStatus(q)&&await canAccessQuote(actor,q)}
module.exports={canReopenQuote};
