export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const f = req.body || {};

    const prompt = `Você é estrategista sênior de agência de publicidade. Gere um briefing profissional completo para os times abaixo com base nos dados fornecidos.

DADOS:
Cliente: ${f.clienteNome || '—'} | Segmento: ${f.clienteSegmento || '—'} | Produto: ${f.clienteProduto || '—'} | URLs: ${f.clienteURLs || '—'}
Campanha: ${f.campanhaNome || '—'} | Objetivos: ${(f.campanhaObjetivos || []).join(', ') || '—'} | KPIs: ${f.campanhaKPIs || '—'}
Descrição: ${f.campanhaDescricao || '—'}
Público: ${f.publicoIdade || '—'}, ${f.publicoGenero || '—'} | Interesses: ${f.publicoInteresses || '—'} | Persona: ${f.publicoPersona || '—'}
Tom: ${f.contextoTom || '—'} | Plataformas: ${(f.plataformas || []).join(', ') || '—'} | Formatos: ${(f.formatos || []).join(', ') || '—'}
Referências: ${f.contextoReferencias || '—'} | Restrições: ${f.contextoRestricoes || '—'}
Verba: ${f.verba || '—'} | Período: ${f.periodo || '—'} | Prazo: ${f.prazo || '—'} | Obs: ${f.observacoes || '—'}

Retorne SOMENTE JSON válido, sem markdown, sem comentários e sem texto fora do JSON, exatamente com esta estrutura:

{
  "exec": {
    "visao_geral": "",
    "desafio": "",
    "objetivos_estrategicos": "",
    "mensagem_central": "",
    "entregaveis": ""
  },
  "social": {
    "objetivo_conteudo": "",
    "pilares": "",
    "tom_voz": "",
    "formatos_sugeridos": "",
    "referencias_criativas": "",
    "metricas": ""
  },
  "midia": {
    "objetivo_midia": "",
    "plataformas_priorizadas": "",
    "publico_segmentacao": "",
    "estrategia_bid": "",
    "budget_sugerido": "",
    "kpis": ""
  },
  "av": {
    "conceito_audiovisual": "",
    "formatos_tecnicos": "",
    "referencias_visuais": "",
    "roteiro_sugestao": "",
    "especificacoes": ""
  },
  "plan": {
    "contexto_mercado": "",
    "insight_central": "",
    "posicionamento": "",
    "arquitetura_mensagem": "",
    "cronograma_sugerido": ""
  }
}

Regras:
- Preencha todos os campos.
- Todos os valores devem ser texto.
- Não use arrays.
- Não use markdown.
- Não inclua nenhuma chave extra.
- Português profissional de agência.
- Seja específico, acionável e objetivo.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'Responda somente com JSON válido, sem markdown, sem comentários e sem texto fora do JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || 'Erro na OpenAI'
      });
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'Resposta vazia da OpenAI' });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return res.status(500).json({
        error: 'A resposta da IA não veio em JSON válido.',
        raw: content
      });
    }

    const required = ['exec', 'social', 'midia', 'av', 'plan'];
    const missing = required.filter((key) => !parsed[key] || typeof parsed[key] !== 'object');

    if (missing.length) {
      return res.status(500).json({
        error: `A resposta da IA veio incompleta. Blocos ausentes: ${missing.join(', ')}`
      });
    }

    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Erro interno do servidor'
    });
  }
}
