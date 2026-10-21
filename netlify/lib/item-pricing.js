// Internal purchasing data is returned only by the authenticated admin endpoint.
const MAX_MONEY = 999999999999.99;
const MAX_MARKUP = 99999999.9999;
function round(value,places=2){const factor=10**places;return Math.round((value+Number.EPSILON)*factor)/factor}
function badInput(message){const error=new Error(message);error.statusCode=400;throw error}
function optionalNumber(value,label,places,max){
  if(value==null||value==='')return null;
  if(!['number','string'].includes(typeof value)||typeof value==='string'&&!/^\d+(?:\.\d+)?$/.test(value.trim()))badInput(`${label}: informe um número válido.`);
  const number=Number(value);
  if(!Number.isFinite(number)||number<0||number>max)badInput(`${label}: informe um valor válido, maior ou igual a zero.`);
  return round(number,places);
}
function normalizeItemPricing(item){
  const unit_cost=optionalNumber(item.unit_cost,'Custo unitário',2,MAX_MONEY);
  const markup_percent=optionalNumber(item.markup_percent,'Markup',4,MAX_MARKUP);
  const supplier_name=String(item.supplier_name??'').trim();
  if(supplier_name.length>300)badInput('O nome do fornecedor deve ter até 300 caracteres.');
  const calculated=unit_cost!==null&&markup_percent!==null;
  const unit_price=calculated?round(unit_cost*(1+markup_percent/100)):optionalNumber(item.unit_price,'Preço unitário',2,MAX_MONEY)??0;
  if(!Number.isFinite(unit_price)||unit_price>MAX_MONEY)badInput('O preço de venda calculado ultrapassa o valor permitido.');
  return {...item,supplier_name:supplier_name||null,unit_cost,markup_percent,unit_price};
}
module.exports={normalizeItemPricing};
