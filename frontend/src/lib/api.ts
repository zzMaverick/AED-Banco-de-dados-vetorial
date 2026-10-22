const BASE = import.meta.env.VITE_API_URL ?? "/api"

export type StatusBusca = "trechos_encontrados" | "sem_evidencia_suficiente"

export interface TrechoResultado {
  documento_id: string
  titulo: string
  area: string
  fonte: string
  versao: string
  secao: string
  trecho_id: string
  texto: string
  modelo: string
  assinatura: string
  similaridade: number
}

export interface RespostaBusca {
  pergunta: string
  area: string | null
  top_k: number
  limiar: number
  status: StatusBusca
  resultados: TrechoResultado[]
  candidatos: TrechoResultado[]
  tempo_ms: number
}

export interface Saude {
  status: string
  qdrant: string
  colecao: string
  documentos: number
  trechos: number
  modelo: string
  dimensoes: number
}

export interface DocumentoResumo {
  id: string
  titulo: string
  area: string
  fonte: string
  versao: string
  secoes: string[]
}

export interface Secao {
  titulo: string
  texto: string
}

export interface Documento {
  id: string
  titulo: string
  area: string
  fonte: string
  versao: string
  secoes: Secao[]
}

export type DocumentoEntrada = Documento

export interface TrechoResumo {
  trecho_id: string
  documento_id: string
  titulo: string
  area: string
  secao: string
}

export interface ResumoAvaliacao {
  positivos: number
  negativos: number
  acuracia_top1_vetorial: number | null
  hit_rate_top3_vetorial: number | null
  acuracia_top1_lexical: number | null
  hit_rate_top3_lexical: number | null
  abstencoes_corretas: number
  positivos_acima_limiar: number
}

export interface CasoAvaliacao {
  id: string
  pergunta: string
  esperado: string | null
  area: string | null
  status: StatusBusca
  tempo_ms: number
  resultados: TrechoResultado[]
  acerto_top1: boolean
  acerto_top3: boolean
  lexical_top1: boolean
  lexical_top3: boolean
  abstencao_correta: boolean
}

export type ConjuntoAvaliacao = "padrao" | "base"

export interface RespostaAvaliacao {
  executado_em_utc: string
  ambiente: Record<string, string>
  modo: string
  modelo: string
  dimensoes: number
  colecao: string
  documentos: number
  trechos: number
  conjunto: ConjuntoAvaliacao
  rotulo: string
  origem: string
  resumo: ResumoAvaliacao
  nota: string
  casos: CasoAvaliacao[]
}

export interface VetorExemplo {
  id: string
  dimensoes: number
  vetor: number[]
  metadados: TrechoResultado
}

export interface ParametrosBusca {
  pergunta: string
  area?: string | null
  top_k?: number
  limiar?: number
}

export class ErroApi extends Error {
  readonly status: number
  readonly campos: Record<string, string>

  constructor(mensagem: string, status: number, campos: Record<string, string> = {}) {
    super(mensagem)
    this.name = "ErroApi"
    this.status = status
    this.campos = campos
  }
}

async function tratarErro(resposta: Response): Promise<never> {
  let mensagem = `Falha na requisição (HTTP ${resposta.status}).`
  let campos: Record<string, string> = {}
  try {
    const corpo = await resposta.json()
    if (corpo?.detail) {
      mensagem = typeof corpo.detail === "string" ? corpo.detail : JSON.stringify(corpo.detail)
    }
    if (corpo?.erros && typeof corpo.erros === "object") {
      campos = corpo.erros as Record<string, string>
    }
  } catch {
    campos = {}
  }
  throw new ErroApi(mensagem, resposta.status, campos)
}

async function obter<T>(caminho: string, init?: RequestInit): Promise<T> {
  let resposta: Response
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    })
  } catch {
    throw new ErroApi("Não foi possível falar com o servidor.", 0)
  }
  if (!resposta.ok) await tratarErro(resposta)
  return (await resposta.json()) as T
}

export const api = {
  saude: () => obter<Saude>("/saude"),
  areas: () => obter<{ areas: string[] }>("/areas"),
  documentos: () => obter<{ total: number; documentos: DocumentoResumo[] }>("/documentos"),
  documento: (id: string) =>
    obter<{ documento: Documento }>(`/documentos/${encodeURIComponent(id)}`),
  trechos: (documentoId?: string) =>
    obter<{ total: number; trechos: TrechoResumo[] }>(
      `/trechos${documentoId ? `?documento_id=${encodeURIComponent(documentoId)}` : ""}`,
    ),
  criarDocumento: (documento: DocumentoEntrada) =>
    obter<{ documento: Documento; mensagem: string }>("/documentos", {
      method: "POST",
      body: JSON.stringify(documento),
    }),
  atualizarDocumento: (id: string, documento: DocumentoEntrada) =>
    obter<{ documento: Documento; mensagem: string }>(`/documentos/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(documento),
    }),
  removerDocumento: (id: string) =>
    obter<{ id: string; mensagem: string }>(`/documentos/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  reindexarDocumento: (id: string) =>
    obter<{ mensagem: string; escopo: string; trechos: number }>(
      `/documentos/${encodeURIComponent(id)}/reindexar`,
      { method: "POST" },
    ),
  reindexarBase: () =>
    obter<{ mensagem: string; escopo: string; documentos: number; trechos: number }>("/reindexar", {
      method: "POST",
    }),
  buscar: (parametros: ParametrosBusca) =>
    obter<RespostaBusca>("/buscar", { method: "POST", body: JSON.stringify(parametros) }),
  avaliar: (conjunto: ConjuntoAvaliacao = "padrao") =>
    obter<RespostaAvaliacao>("/avaliar", { method: "POST", body: JSON.stringify({ conjunto }) }),
  vetorExemplo: (trechoId?: string) =>
    obter<VetorExemplo>(
      `/vetor/exemplo${trechoId ? `?trecho_id=${encodeURIComponent(trechoId)}` : ""}`,
    ),
}
