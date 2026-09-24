const crypto = require('node:crypto');
const { getActor, canWriteQuotes } = require('../lib/auth');

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const sign = (value, secret) => crypto.createHmac('sha256', secret).update(value).digest('base64url');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Método não permitido.' });
    const actor = await getActor(event);
    if (!actor) return json(401, { error: 'Entre na sua conta novamente.' });
    if (!canWriteQuotes(actor)) return json(403, { error: 'Seu perfil não pode editar cotações.' });
    const key = Netlify.env.get('BRAVE_SEARCH_API_KEY');
    if (!key) return json(503, { error: 'Busca de imagens ainda não configurada. Você pode enviar uma foto manualmente.' });
    const body = JSON.parse(event.body || '{}');

    if (body.action === 'search') {
      const query = String(body.query || '').trim().slice(0, 180);
      if (query.length < 4) return json(400, { error: 'Descreva o produto com marca, modelo ou código.' });
      const endpoint = new URL('https://api.search.brave.com/res/v1/images/search');
      endpoint.search = new URLSearchParams({ q: `${query} fundo branco`, country: 'BR', search_lang: 'pt', count: '12', safesearch: 'strict' }).toString();
      const response = await fetch(endpoint, { headers: { 'X-Subscription-Token': key, Accept: 'application/json' }, signal: AbortSignal.timeout(9000) });
      if (!response.ok) return json(502, { error: 'A busca de imagens está indisponível no momento.' });
      const data = await response.json();
      const images = (data.results || []).flatMap((item) => {
        const src = item.thumbnail?.src;
        if (!src) return [];
        try { if (new URL(src).hostname !== 'imgs.search.brave.com') return []; } catch { return []; }
        const payload = Buffer.from(JSON.stringify({ src, exp: Date.now() + 15 * 60 * 1000, user: actor.user.id })).toString('base64url');
        return [{ title: item.title || 'Imagem do produto', source: item.source || '', sourcePage: item.url || '', preview: src, ticket: `${payload}.${sign(payload, key)}` }];
      });
      return json(200, { images });
    }

    if (body.action === 'import') {
      const [payload, signature] = String(body.ticket || '').split('.');
      if (!payload || !/^[A-Za-z0-9_-]{43}$/.test(signature || '') || payload.length > 4096 || !crypto.timingSafeEqual(Buffer.from(sign(payload, key)), Buffer.from(signature))) return json(400, { error: 'Seleção de imagem inválida.' });
      const selected = JSON.parse(Buffer.from(payload, 'base64url').toString());
      if (selected.exp < Date.now() || selected.user !== actor.user.id) return json(400, { error: 'A seleção expirou. Faça a busca novamente.' });
      const url = new URL(selected.src);
      if (url.protocol !== 'https:' || url.hostname !== 'imgs.search.brave.com') return json(400, { error: 'Origem da imagem inválida.' });
      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(9000) });
      if (!response.ok) throw new Error('Não foi possível obter a imagem selecionada.');
      const type = (response.headers.get('content-type') || '').split(';')[0];
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) return json(400, { error: 'Formato de imagem não aceito.' });
      if (Number(response.headers.get('content-length')) > 4_000_000) return json(400, { error: 'Imagem muito grande.' });
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 4_000_000) return json(400, { error: 'Imagem muito grande.' });
      const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[type];
      const path = `selected/${actor.user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await actor.supabase.storage.from('quote-images').upload(path, bytes, { contentType: type, upsert: false });
      if (error) throw error;
      return json(200, { image_url: actor.supabase.storage.from('quote-images').getPublicUrl(path).data.publicUrl });
    }
    return json(400, { error: 'Ação inválida.' });
  } catch (error) {
    console.error('product-image:', error);
    return json(500, { error: 'Não foi possível processar a imagem. Tente outra opção.' });
  }
};
