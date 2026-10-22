import { useMemo, useState } from "react"

import { EstadoErro } from "@/components/estado-erro"
import { IconeBusca, IconeSemResultado, IlustracaoBoasVindas } from "@/components/icons"
import { PageHeader } from "@/components/page-header"
import { ResultadoCard } from "@/components/resultado-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { useAsync } from "@/hooks/use-async"
import { api, type RespostaBusca } from "@/lib/api"
import { formatarSimilaridade, formatarTempo } from "@/lib/utils"

const EXEMPLOS = [
  "Qual é o procedimento para aprovar uma compra emergencial?",
  "Paguei o hotel da viagem de trabalho do meu bolso. Como recebo de volta?",
  "Esqueci minha senha e não consigo entrar no sistema.",
  "Quero trabalhar de casa e acessar a rede do escritório.",
]

const TODAS = "__todas__"

export function BuscarPage() {
  const [pergunta, setPergunta] = useState("")
  const [area, setArea] = useState(TODAS)
  const [topK, setTopK] = useState(3)
  const [limiar, setLimiar] = useState(0.4)

  const [resultado, setResultado] = useState<RespostaBusca | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const { dados: areasDados } = useAsync(() => api.areas(), [])

  const candidatosAbaixo = useMemo(() => {
    if (!resultado) return []
    const aceitos = new Set(resultado.resultados.map((r) => r.trecho_id))
    return resultado.candidatos.filter((c) => !aceitos.has(c.trecho_id))
  }, [resultado])

  async function buscar(termo = pergunta) {
    const texto = termo.trim()
    if (!texto) {
      setErro("Informe uma pergunta antes de buscar.")
      return
    }
    setPergunta(texto)
    setCarregando(true)
    setErro(null)
    try {
      const resposta = await api.buscar({
        pergunta: texto,
        area: area === TODAS ? null : area,
        top_k: topK,
        limiar,
      })
      setResultado(resposta)
    } catch (falha) {
      setResultado(null)
      setErro((falha as Error).message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader titulo="Buscar" descricao="Localize o procedimento pela situação descrita." />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Consulta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(evento) => {
              evento.preventDefault()
              void buscar()
            }}
          >
            <Input
              value={pergunta}
              onChange={(evento) => setPergunta(evento.target.value)}
              placeholder="Descreva a situação ou o assunto"
              aria-label="Pergunta"
              className="h-11"
            />
            <Button type="submit" size="lg" className="h-11 sm:w-36" disabled={carregando}>
              <IconeBusca className="h-4 w-4" />
              {carregando ? "Buscando..." : "Buscar"}
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Exemplos:</span>
            {EXEMPLOS.map((exemplo) => (
              <button
                key={exemplo}
                type="button"
                onClick={() => void buscar(exemplo)}
                className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground"
              >
                {exemplo}
              </button>
            ))}
          </div>

          <Separator />

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="area">Área</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger id="area">
                  <SelectValue placeholder="Todas as áreas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas as áreas</SelectItem>
                  {(areasDados?.areas ?? []).map((nome) => (
                    <SelectItem key={nome} value={nome}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topk">Trechos por consulta</Label>
              <Select value={String(topK)} onValueChange={(valor) => setTopK(Number(valor))}>
                <SelectTrigger id="topk">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 8, 10, 15, 20].map((valor) => (
                    <SelectItem key={valor} value={String(valor)}>
                      {valor} trecho{valor > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="limiar">Limiar de similaridade</Label>
                <Badge variant="secondary" className="tabular-nums">
                  {formatarSimilaridade(limiar)}
                </Badge>
              </div>
              <Slider
                id="limiar"
                min={-1}
                max={1}
                step={0.01}
                value={[limiar]}
                onValueChange={(valores) => setLimiar(valores[0])}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {erro ? <EstadoErro mensagem={erro} aoTentarNovamente={() => void buscar()} /> : null}

      {carregando ? <EsqueletoResultados /> : null}

      {!carregando && resultado ? (
        <section className="space-y-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Resultados</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{resultado.resultados.length} acima do limiar</Badge>
              <Badge variant="muted">{resultado.candidatos.length} avaliados</Badge>
              <Badge variant="muted">{formatarTempo(resultado.tempo_ms)}</Badge>
            </div>
          </div>

          {resultado.status === "sem_evidencia_suficiente" ? (
            <Alert variant="warning">
              <IconeSemResultado />
              <AlertTitle>Nenhum trecho atingiu o limiar</AlertTitle>
              <AlertDescription>
                Nenhum trecho da base ficou acima de {formatarSimilaridade(resultado.limiar)} para esta pergunta.
              </AlertDescription>
            </Alert>
          ) : null}

          {resultado.resultados.map((trecho, indice) => (
            <ResultadoCard
              key={trecho.trecho_id}
              trecho={trecho}
              posicao={indice + 1}
              limiar={resultado.limiar}
              aceito
            />
          ))}

          {candidatosAbaixo.length > 0 ? (
            <details className="rounded-xl border bg-muted/30 p-4">
              <summary className="cursor-pointer text-sm font-medium">
                {candidatosAbaixo.length} candidato(s) abaixo do limiar
              </summary>
              <div className="mt-4 space-y-4">
                {candidatosAbaixo.map((trecho, indice) => (
                  <ResultadoCard
                    key={trecho.trecho_id}
                    trecho={trecho}
                    posicao={resultado.resultados.length + indice + 1}
                    limiar={resultado.limiar}
                    aceito={false}
                  />
                ))}
              </div>
            </details>
          ) : null}
        </section>
      ) : null}

      {!carregando && !resultado && !erro ? (
        <section className="rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
          <IlustracaoBoasVindas className="mx-auto h-[140px] w-auto text-primary/70" />
          <h2 className="mt-4 text-base font-semibold">Nenhuma consulta realizada</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Descreva a situação com suas próprias palavras ou use um dos exemplos acima.
          </p>
        </section>
      ) : null}
    </div>
  )
}

function EsqueletoResultados() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((chave) => (
        <Card key={chave}>
          <CardHeader className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-2 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
