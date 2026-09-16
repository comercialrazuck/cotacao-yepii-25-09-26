const { gunzipSync } = require('zlib');

exports.handler = async () => {
  try {
    const sourceUrl = 'https://raw.githubusercontent.com/comercialrazuck/cotacao-yepii-25-09-26/main/termos.html';
    const response = await fetch(sourceUrl, { headers: { 'cache-control': 'no-cache' } });
    if (!response.ok) throw new Error(`Fonte dos termos indisponível (${response.status})`);
    const wrapper = await response.text();
    const match = wrapper.match(/const b64='([^']+)'/);
    if (!match) throw new Error('Conteúdo completo dos termos não encontrado');
    const html = gunzipSync(Buffer.from(match[1], 'base64')).toString('utf8');
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
      },
      body: html
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      body: `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Termos e Políticas Yepii</title><body style="font-family:Arial,sans-serif;padding:40px;color:#242424"><h2 style="color:#ff6600">Yepii</h2><p>Não foi possível carregar os Termos e Políticas.</p><p style="color:#777;font-size:13px">${String(error.message || error)}</p></body></html>`
    };
  }
};
