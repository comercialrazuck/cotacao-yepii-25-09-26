const { createClient } = require('@supabase/supabase-js');

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return json(405, { error: 'Method not allowed' });
    }

    // This endpoint only returns the next display number.
    // It intentionally does not require an authenticated browser session.
    // The Supabase secret remains server-side in Netlify.
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data, error } = await supabase
      .from('quotes')
      .select('quote_number')
      .order('quote_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const lastN = parseInt(
      String(data?.quote_number || '0').replace(/\D/g, ''),
      10
    ) || 0;

    return json(200, {
      quote_number: String(lastN + 1).padStart(7, '0')
    });
  } catch (e) {
    return json(500, { error: e.message || 'Erro inesperado' });
  }
};
