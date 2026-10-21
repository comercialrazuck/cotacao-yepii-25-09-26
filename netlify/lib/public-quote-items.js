const PUBLIC_QUOTE_ITEM_COLUMNS='id,position,description,quantity,unit_price,line_total,image_url,selected';
const publicFields=PUBLIC_QUOTE_ITEM_COLUMNS.split(',');
function publicQuoteItem(item){return Object.fromEntries(publicFields.map(key=>[key,item[key]]))}
module.exports={PUBLIC_QUOTE_ITEM_COLUMNS,publicQuoteItem};
