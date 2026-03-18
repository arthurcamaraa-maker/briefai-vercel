// =======================
// API - /api/generate-brief.js (ATUALIZADO)
// =======================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const f = req.body || {};

    const prompt = `Você é um profissional de operações de marketing responsável por transformar um briefing em entregáveis claros para áreas executiva e de mídia.

IMPORTANTE:
- NÃO faça análise estratégica profunda
- NÃO use linguagem genérica
- NÃO invente contexto
- FOQUE em execução

OBJETIVO:
Transformar o briefing em entregáveis claros, acionáveis e prontos para execução

DADOS DO BRIEFING:

CLIENTE:
Nome: ${f.clienteNome || ''}
Segmento: ${f.clienteSegmento || ''}
Produto: ${f.clienteProduto || ''}
Site: ${f.clienteSite || ''}
Redes sociais: ${f.clienteRedes || ''}

PÚBLICO:
Idade: ${f.publicoIdade || ''}
Gênero: ${f.publicoGenero || ''}
Interesses: ${f.publicoInteresses || ''}
Cidade/Estado: ${f.publicoLocalizacao || ''}

CAMPANHA:
Nome: ${f.campanhaNome || ''}
Descrição: ${f.campanhaDescricao || ''}
O que será comunicado: ${f.campanhaMensagem || ''}
Oferta ativa: ${f.campanhaOferta || ''}
Problemas passados a evitar: ${f.campanhaProblemas || ''}
Expectativa de entrega final: ${f.campanhaExpectativa || ''}
Objetivos: ${(f.campanhaObjetivos || []).join(', ')}

CONTEXTO CRIATIVO:
Tom: ${f.contextoTom || ''}
Referências: ${f.contextoReferencias || ''}
Restrições: ${f.contextoRestricoes || ''}
Materiais existentes (links): ${f.contextoMateriais || ''}

VERBA E TIMING:
Verba: ${f.verba || ''}
Período: ${f.periodo || ''}
Prazo: ${f.prazo || ''}

INSTRUÇÕES DE EXECUÇÃO:
1. Use TODOS os dados fornecidos
2. Transforme tudo em entregáveis práticos
3. Conecte cada output ao que foi preenchido
4. Se houver "expectativa de entrega", priorize isso
5. Se houver "problemas passados", evite-os explicitamente
6. Estruture como checklist e instruções operacionais
7. Seja claro, direto e aplicável

SAÍDA:
Retorne SOMENTE JSON válido com esta estrutura:

{
  "exec": {
    "resumo_operacional": "",
    "escopo_da_campanha": "",
    "objetivos_convertidos_em_entregaveis": "",
    "diretrizes_gerais": "",
    "restricoes_e_observacoes": ""
  },
  "midia": {
    "estrutura_de_campanhas": "",
    "plataformas_e_objetivos": "",
    "segmentacoes_previstas": "",
    "formatos_de_anuncios": "",
    "kpis_e_metricas": ""
  }
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Responda somente com JSON válido. Não use markdown. Não escreva fora do JSON.'
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
      return res.status(500).json({ error: 'Resposta vazia da IA' });
    }

    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch (err) {
      return res.status(500).json({
        error: 'JSON inválido retornado pela IA',
        raw: content
      });
    }

    return res.status(200).json(parsed);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// =======================
// FRONT - CAMPOS ATUALIZADOS (RESUMO)
// =======================

/*
ORDEM DOS BLOCOS:
cliente > publico > campanha > contexto criativo > verba

NOVOS CAMPOS ADICIONADOS:

cliente:
- clienteSite
- clienteRedes

publico:
- publicoLocalizacao (cidade + estado)

campanha:
- campanhaDescricao (min 300 chars)
- campanhaMensagem
- campanhaOferta
- campanhaProblemas (problemas passados a evitar)
- campanhaExpectativa (o que espera receber: ex criativos, plano mídia etc)

contexto criativo:
- contextoMateriais (links drive/dropbox etc)

*/
