const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function editor(){
 const input=value=>({value,removeAttribute(){},setAttribute(){}}),fields={'.pricing-cost':input('100,00'),'.pricing-markup':input('30,21'),'.pricing-supplier':input('Fornecedor'),'.pricing-hint':{},'.pricing-mode':{}};
 const panel={dataset:{manualPrice:'true'},classList:{remove(){},add(){}},querySelector:s=>fields[s],querySelectorAll:()=>Object.values(fields).filter(x=>'value'in x)};
 const unit=input('125,49'),tr={querySelector:s=>s==='.unit'?unit:panel};
 const ctx={finalStatuses:['accepted'],currentStatus:'draft',br:n=>n.toFixed(2).replace('.',',')};vm.createContext(ctx);
 vm.runInContext(['pricingRound','internalPricingNumber','readItemPricing','syncItemPricing'].map(name=>source.split('\n').find(line=>line.startsWith('function '+name+'('))).join('\n'),ctx);
 return {ctx,panel,unit,tr,fields};
}
test('editor preserves loaded manual price, rounds calculation up and leaves sale editable',()=>{
 const e=editor();e.ctx.syncItemPricing(e.tr);assert.equal(e.unit.value,'125,49');assert.equal(e.unit.readOnly,false);
 e.ctx.syncItemPricing(e.tr,true);assert.equal(e.unit.value,'131,00');assert.equal(e.unit.readOnly,false);assert.equal(e.ctx.readItemPricing(e.tr).manual_unit_price,false);
 e.unit.value='119,90';e.panel.dataset.manualPrice='true';e.ctx.syncItemPricing(e.tr);assert.equal(e.unit.value,'119,90');assert.equal(e.ctx.readItemPricing(e.tr).manual_unit_price,true);
 e.fields['.pricing-markup'].value='30';e.ctx.syncItemPricing(e.tr,true);assert.equal(e.unit.value,'130,00');
 e.ctx.currentStatus='accepted';e.ctx.syncItemPricing(e.tr);assert.equal(e.unit.readOnly,true);
});
