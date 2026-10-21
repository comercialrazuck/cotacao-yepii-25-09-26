const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeItemPricing}=require('../netlify/lib/item-pricing');
const {publicQuoteItem}=require('../netlify/lib/public-quote-items');

test('blank markup stays null and preserves manual sale price',()=>{
 const result=normalizeItemPricing({unit_cost:100,markup_percent:'',unit_price:147.9,supplier_name:'  Fornecedor A  '});
 assert.equal(result.markup_percent,null);assert.equal(result.unit_price,147.9);assert.equal(result.unit_cost,100);assert.equal(result.supplier_name,'Fornecedor A');
});
test('server calculates sale from cost and individual markup instead of trusting a stale client price',()=>{
 assert.equal(normalizeItemPricing({unit_cost:100,markup_percent:30,unit_price:999}).unit_price,130);
 assert.equal(normalizeItemPricing({unit_cost:100,markup_percent:45,unit_price:999}).unit_price,145);
 assert.equal(normalizeItemPricing({unit_cost:19.99,markup_percent:12.5}).unit_price,23);
});
test('zero markup and zero cost are meaningful values',()=>{
 assert.equal(normalizeItemPricing({unit_cost:100,markup_percent:0}).unit_price,100);
 assert.equal(normalizeItemPricing({unit_cost:0,markup_percent:30}).unit_price,0);
});
test('missing cost leaves the manual sale unchanged',()=>{
 const result=normalizeItemPricing({unit_cost:null,markup_percent:30,unit_price:22});
 assert.equal(result.unit_cost,null);assert.equal(result.unit_price,22);
});
test('legacy items retain their price without inventing a markup',()=>{
 const result=normalizeItemPricing({unit_price:8.9});
 assert.equal(result.unit_price,8.9);assert.equal(result.unit_cost,null);assert.equal(result.markup_percent,null);assert.equal(result.supplier_name,null);
});
test('invalid purchasing values are rejected before saving',()=>{
 for(const item of [{unit_cost:-1},{markup_percent:-1},{unit_cost:'abc'},{markup_percent:true},{unit_cost:Infinity},{unit_cost:999999999999.99,markup_percent:100},{supplier_name:'a'.repeat(301)}]){
  assert.throws(()=>normalizeItemPricing(item),error=>error.statusCode===400);
 }
});
test('public items exclude supplier, cost and markup even if the database result unexpectedly contains them',()=>{
 const item=publicQuoteItem({id:'i1',description:'Produto',unit_price:130,unit_cost:100,markup_percent:30,supplier_name:'Segredo interno',other_private_data:'x'});
 assert.equal(item.unit_price,130);for(const key of ['unit_cost','markup_percent','supplier_name','other_private_data'])assert.equal(Object.hasOwn(item,key),false);
});

test('calculated prices round up to whole reais while manual prices keep cents',()=>{
 assert.equal(normalizeItemPricing({unit_cost:100,markup_percent:30.21}).unit_price,131);
 assert.equal(normalizeItemPricing({unit_cost:100,markup_percent:30}).unit_price,130);
 assert.equal(normalizeItemPricing({unit_cost:100,markup_percent:30,unit_price:125.49,manual_unit_price:true}).unit_price,125.49);
 assert.equal(normalizeItemPricing({unit_cost:100,markup_percent:30,unit_price:0,manual_unit_price:true}).unit_price,0);
});
