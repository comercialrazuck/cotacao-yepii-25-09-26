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

    const supabaseUrl = process.env.SUPABASE_URL || 'https://szcahilagrdnlvogngxg.supabase.co';
    const publishableKey = 'sb_publishable_9OnuKQOmBQR7TArHu3-X7g_HXbQpQoc';

    const supabase = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data, error } = await supabase.rpc('get_next_quote_number');
    if (error) throw error;

    return json(200, { quote_number: data });
  } catch (e) {
    return json(500, { error: e.message || 'Erro inesperado' });
  }
};
