module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ message: 'Método não permitido. Use POST.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      message: 'OPENAI_API_KEY não configurada no Vercel.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const form = body.form || {};
    const prompt = body.prompt || '';
    const model = body.model || 'gpt-4o-mini';

    if (!prompt.trim()) {
      return res.status(400).json({ message: 'Prompt ausente.' });
    }

    const systemPrompt = 'Você é um estrategista sênior de agência de publicidade. Responda sempre com JSON válido, sem markdown e sem texto fora do JSON.';

    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 2200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        message: data?.error?.message || 'Falha ao chamar a OpenAI.',
        details: data?.error || null
      });
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!content || typeof content !== 'string') {
      return res.status(502).json({
        message: 'A OpenAI respondeu sem conteúdo utilizável.',
        raw: data
      });
    }

    let output;
    try {
      output = JSON.parse(content);
    } catch (err) {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) {
        return res.status(502).json({
          message: 'A OpenAI não retornou JSON válido.',
          content
        });
      }
      output = JSON.parse(match[0]);
    }

    return res.status(200).json({
      ok: true,
      provider: 'openai',
      model,
      output,
      meta: {
        cliente: form.clienteNome || null,
        campanha: form.campanhaNome || null
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || 'Erro interno ao gerar briefing.'
    });
  }
};
