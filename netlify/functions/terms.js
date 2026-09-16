const {gunzipSync}=require('zlib');

function termsHtml(){
  const b64=[
    require('./terms-data/part1'),
    require('./terms-data/part2'),
    require('./terms-data/part3'),
    require('./terms-data/part4'),
    require('./terms-data/part5')
  ].join('');
  return gunzipSync(Buffer.from(b64,'base64')).toString('utf8');
}

exports.handler=async()=>{
  try{
    const html=termsHtml();
    return {statusCode:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'},body:html};
  }catch(error){
    return {statusCode:500,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'},body:`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Termos e Políticas Yepii</title><body style="font-family:Arial,sans-serif;padding:40px;color:#242424"><h2 style="color:#ff6600">Yepii</h2><p>Não foi possível carregar os Termos e Políticas.</p><p style="color:#777;font-size:13px">Erro técnico: ${String(error.message||error)}</p></body></html>`};
  }
};
