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
    const body = typeof req.body === 'string'
      ? JSON.parse(req.body || '{}')
      : (req.body || {});

    const form = body.form || {};
    const prompt = String(body.prompt || '').trim();
    const model = body.model || 'gpt-4o-mini';

    if (!prompt) {
      return res.status(400).json({ message: 'Prompt ausente.' });
    }

    const systemPrompt = [
      'Você é um estrategista sênior de agência de publicidade.',
      'Sua tarefa é gerar um briefing estruturado para uso profissional.',
      'Responda APENAS com JSON válido.',
      'Não use markdown.',
      'Não use crases.',
      'Não escreva comentários.',
      'Não escreva nenhum texto antes ou depois do JSON.',
      'Todos os valores devem ser strings simples e válidas em JSON.',
      'Evite aspas desnecessárias dentro do texto.',
      'Se precisar listar itens, use hífens dentro da própria string.',
      'O objeto final deve conter exatamente estas chaves:',
      'resumo_executivo, objetivos, publico_alvo, estrategia_canais, plano_de_midia, kpis, recomendacoes'
    ].join(' ');

    const userPrompt = `${prompt}\n\nIMPORTANTE: devolva exatamente um objeto JSON com estas 7 chaves obrigatórias: resumo_executivo, objetivos, publico_alvo, estrategia_canais, plano_de_midia, kpis, recomendacoes. Todos os campos devem ser texto.`;

    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 2200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
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
      return res.status(502).json({
        message: 'A OpenAI retornou JSON inválido.',
        raw: content,
        parse_error: err?.message || 'Falha ao interpretar JSON.'
      });
    }

    const normalizedOutput = {
      resumo_executivo: String(output?.resumo_executivo || ''),
      objetivos: String(output?.objetivos || ''),
      publico_alvo: String(output?.publico_alvo || ''),
      estrategia_canais: String(output?.estrategia_canais || ''),
      plano_de_midia: String(output?.plano_de_midia || ''),
      kpis: String(output?.kpis || ''),
      recomendacoes: String(output?.recomendacoes || '')
    };

    return res.status(200).json({
      ok: true,
      provider: 'openai',
      model,
      output: normalizedOutput,
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
