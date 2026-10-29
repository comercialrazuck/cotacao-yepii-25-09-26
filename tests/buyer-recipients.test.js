const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {buyerEmails}=require('../netlify/lib/buyer-recipients');
test('recipient validation supports old single addresses, lists, deduplication and rejects malformed addresses',()=>{
 assert.deepEqual(buyerEmails('Uma@Example.com'),['uma@example.com']);assert.deepEqual(buyerEmails('a@example.com; b@example.com, A@example.com'),['a@example.com','b@example.com']);assert.throws(()=>buyerEmails('a@example.com\nBcc: bad@example.com'));assert.throws(()=>buyerEmails('',{required:true}));assert.throws(()=>buyerEmails(Array.from({length:51},(_,i)=>`a${i}@example.com`)));
});
test('initial emails and reminders deliver the complete saved recipient list to Resend',async()=>{
 const m={exports:{}},requests=[];const filename=path.resolve(__dirname,'../netlify/lib/email.js');vm.runInNewContext(fs.readFileSync(filename,'utf8'),{module:m,exports:m.exports,require:spec=>require(path.resolve(path.dirname(filename),spec)),process:{env:{RESEND_API_KEY:'offline-test-key',RESEND_FROM_EMAIL:'teste@example.com'}},Date,fetch:async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({id:'test-email'})}}});
 const q={id:'q',quote_number:'Y26-10001',client_email:'ana@example.com, bruno@example.com'};for(const headline of ['Proposta','Lembrete']){const result=await m.exports.sendQuoteEmail(q,{headline,message:'Teste',toOverride:q.client_email});assert.equal(result.sent,true);assert.deepEqual(result.to,['ana@example.com','bruno@example.com'])}assert.equal(requests.length,2);requests.forEach(r=>assert.deepEqual(r.body.to,['ana@example.com','bruno@example.com']));
});
