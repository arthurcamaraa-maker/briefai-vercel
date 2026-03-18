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
- Use obrigatoriamente as informações recebidas para preencher os campos
- Traduza o briefing em entregáveis claros por área

OBJETIVO:
Transformar o briefing em entregáveis claros, acionáveis e prontos para execução.

DADOS DO BRIEFING:

CLIENTE:
Nome: ${f.clienteNome || ''}
Segmento: ${f.clienteSegmento || ''}
Produto/serviço: ${f.clienteProduto || ''}
Site: ${f.clienteSite || ''}
Redes sociais: ${f.clienteRedes || ''}

PÚBLICO-ALVO:
Idade: ${f.publicoIdade || ''}
Gênero: ${f.publicoGenero || ''}
Interesses/comportamentos: ${f.publicoInteresses || ''}
Persona: ${f.publicoPersona || ''}
Cidade/Estado: ${f.publicoLocalizacao || ''}

CAMPANHA:
Nome: ${f.campanhaNome || ''}
Descrição da campanha: ${f.campanhaDescricao || ''}
O que exatamente será comunicado: ${f.campanhaMensagem || ''}
Existe oferta ativa: ${f.campanhaOferta || ''}
Problemas passados que devemos evitar: ${f.campanhaProblemas || ''}
O que você espera receber no final deste briefing: ${f.campanhaExpectativa || ''}
Objetivos: ${Array.isArray(f.campanhaObjetivos) ? f.campanhaObjetivos.join(', ') : (f.campanhaObjetivos || '')}
KPIs desejados: ${f.campanhaKPIs || ''}

CONTEXTO CRIATIVO:
Tom da comunicação: ${f.contextoTom || ''}
Plataformas selecionadas: ${Array.isArray(f.plataformas) ? f.plataformas.join(', ') : (f.plataformas || '')}
Formatos selecionados: ${Array.isArray(f.formatos) ? f.formatos.join(', ') : (f.formatos || '')}
Referências: ${f.contextoReferencias || ''}
Restrições: ${f.contextoRestricoes || ''}
Existe material já pronto? Links com conteúdo hospedado: ${f.contextoMateriais || ''}

VERBA & TIMING:
Verba: ${f.verba || ''}
Período: ${f.periodo || ''}
Prazo: ${f.prazo || ''}
Observações adicionais: ${f.observacoes || ''}

INSTRUÇÕES DE EXECUÇÃO:
1. Use TODOS os dados preenchidos.
2. Converta o briefing em entregáveis claros por área.
3. Seja objetivo, prático e operacional.
4. Evite análises estratégicas profundas.
5. Não use linguagem genérica.
6. Use listas e descrições claras de execução.
7. Sempre considere os campos preenchidos, especialmente cliente, público, campanha, plataformas, formatos, verba, prazo, restrições, problemas passados, expectativa de entrega e materiais existentes.
8. Se algum dado estiver ausente, faça suposições mínimas e neutras, sem inventar contexto complexo.
9. Se houver expectativa de entrega final, priorize essa expectativa no detalhamento dos entregáveis.
10. Se houver problemas passados, deixe explícito nas restrições e observações como evitá-los.
11. Escreva como um briefing interno de execução.
12. Todos os valores devem ser texto, sem arrays, sem markdown e sem chaves extras.

SAÍDA:
Retorne SOMENTE JSON válido com esta estrutura exata:

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
            content: 'Responda somente com JSON válido. Não use markdown. Não escreva nada fora do JSON.'
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

    const requiredTop = ['exec', 'midia'];
    const missingTop = requiredTop.filter((key) => !parsed[key] || typeof parsed[key] !== 'object');

    if (missingTop.length) {
      return res.status(500).json({
        error: `Blocos ausentes na resposta: ${missingTop.join(', ')}`
      });
    }

    const execFields = [
      'resumo_operacional',
      'escopo_da_campanha',
      'objetivos_convertidos_em_entregaveis',
      'diretrizes_gerais',
      'restricoes_e_observacoes'
    ];

    const midiaFields = [
      'estrutura_de_campanhas',
      'plataformas_e_objetivos',
      'segmentacoes_previstas',
      'formatos_de_anuncios',
      'kpis_e_metricas'
    ];

    function normalizeSection(obj, keys) {
      const out = {};
      for (const key of keys) {
        out[key] = typeof obj?.[key] === 'string' ? obj[key] : '';
      }
      return out;
    }

    parsed.exec = normalizeSection(parsed.exec, execFields);
    parsed.midia = normalizeSection(parsed.midia, midiaFields);

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({
      error: e.message || 'Erro interno do servidor'
    });
  }
}
