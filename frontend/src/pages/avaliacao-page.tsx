import { useState } from "react"

import { CartaoMetrica } from "@/components/cartao-metrica"
import { EstadoErro } from "@/components/estado-erro"
import { EstadoVazio } from "@/components/estado-vazio"
import { IconeAvaliacao, IconeExecutar, IconeIncorreto, IconeVerificado } from "@/components/icons"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api, type ConjuntoAvaliacao, type RespostaAvaliacao } from "@/lib/api"
import { cn } from "@/lib/utils"

const ROTULOS: Record<ConjuntoAvaliacao, string> = {
  padrao: "Conjunto de teste",
  base: "Documentos da base",
}

const APOIOS: Record<ConjuntoAvaliacao, string> = {
  padrao: "Perguntas com documento esperado",
  base: "Título de cada documento como consulta",
}

function percentual(valor: number | null) {
  return valor === null ? "—" : `${(valor * 100).toFixed(1)}%`
}

export function AvaliacaoPage() {
  const [conjunto, setConjunto] = useState<ConjuntoAvaliacao>("padrao")
  const [dados, setDados] = useState<RespostaAvaliacao | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function executar(selecionado: ConjuntoAvaliacao) {
    setCarregando(true)
    setErro(null)
    try {
      setDados(await api.avaliar(selecionado))
    } catch (falha) {
      setDados(null)
      setErro((falha as Error).message)
    } finally {
      setCarregando(false)
    }
  }

  function trocarConjunto(valor: string) {
    const selecionado = valor as ConjuntoAvaliacao
    setConjunto(selecionado)
    if (dados) void executar(selecionado)
  }

  const base = dados?.conjunto === "base"

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Avaliação"
        descricao="Recuperação medida sobre o conjunto selecionado e a linha de base lexical."
        acao={
          <div className="flex items-start gap-2">
            <div className="w-56 space-y-1">
              <Select value={conjunto} onValueChange={trocarConjunto}>
                <SelectTrigger aria-label="Conjunto avaliado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="padrao">{ROTULOS.padrao}</SelectItem>
                  <SelectItem value="base">{ROTULOS.base}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{APOIOS[conjunto]}</p>
            </div>
            <Button onClick={() => void executar(conjunto)} disabled={carregando}>
              <IconeExecutar className="h-4 w-4" />
              {carregando ? "Avaliando..." : "Executar avaliação"}
            </Button>
          </div>
        }
      />

      {erro ? <EstadoErro mensagem={erro} aoTentarNovamente={() => void executar(conjunto)} /> : null}

      {carregando ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((chave) => (
            <Card key={chave}>
              <CardContent className="p-5">
                <Skeleton className="mb-3 h-3 w-1/2" />
                <Skeleton className="h-8 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {!carregando && !dados && !erro ? (
        <EstadoVazio
          icone={IconeAvaliacao}
          titulo="Nenhuma avaliação executada"
          descricao={`Execute a avaliação sobre ${ROTULOS[conjunto]}.`}
        />
      ) : null}

      {!carregando && dados ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CartaoMetrica
              rotulo={base ? "Recuperação Top-1 (vetorial)" : "Acerto Top-1 (vetorial)"}
              valor={percentual(dados.resumo.acuracia_top1_vetorial)}
              descricao={base ? "Documento localizado pelo próprio título" : "Documento esperado em 1º lugar"}
            />
            <CartaoMetrica
              rotulo={base ? "Recuperação Top-3 (vetorial)" : "Acerto Top-3 (vetorial)"}
              valor={percentual(dados.resumo.hit_rate_top3_vetorial)}
              descricao={
                base
                  ? "Documento entre os 3 primeiros pelo título"
                  : "Documento esperado entre os 3 primeiros"
              }
            />
            <CartaoMetrica
              rotulo={base ? "Recuperação Top-1 (lexical)" : "Acerto Top-1 (lexical)"}
              valor={percentual(dados.resumo.acuracia_top1_lexical)}
              descricao="Baseline por IDF dos termos"
            />
            <CartaoMetrica
              rotulo={base ? "Recuperação Top-3 (lexical)" : "Acerto Top-3 (lexical)"}
              valor={percentual(dados.resumo.hit_rate_top3_lexical)}
              descricao="Baseline por IDF dos termos"
            />
            {base ? null : (
              <CartaoMetrica
                rotulo="Abstenções corretas"
                valor={`${dados.resumo.abstencoes_corretas}/${dados.resumo.negativos}`}
                descricao="Perguntas fora do domínio recusadas"
              />
            )}
            <CartaoMetrica
              rotulo="Positivas acima do limiar"
              valor={`${dados.resumo.positivos_acima_limiar}/${dados.resumo.positivos}`}
              descricao="Casos com pelo menos um trecho aceito"
            />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Casos avaliados ({dados.casos.length})</CardTitle>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{dados.origem}</Badge>
                <Badge variant="outline">{dados.documentos} documentos</Badge>
                <Badge variant="outline">{dados.trechos} trechos</Badge>
                <Badge variant="outline">{dados.dimensoes} dimensões</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Pergunta</TableHead>
                    <TableHead className="w-[110px]">Esperado</TableHead>
                    <TableHead className="w-[130px]">Status</TableHead>
                    <TableHead className="w-[90px] text-center">Top-1</TableHead>
                    <TableHead className="w-[90px] text-center">Top-3</TableHead>
                    <TableHead className="w-[110px] text-center">Lexical T1</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.casos.map((caso) => (
                    <TableRow key={caso.id}>
                      <TableCell className="font-mono text-xs">{caso.id}</TableCell>
                      <TableCell className="max-w-[420px] text-sm">{caso.pergunta}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{caso.esperado ?? "fora do domínio"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={caso.status === "trechos_encontrados" ? "success" : "warning"}
                        >
                          {caso.status === "trechos_encontrados" ? "Encontrado" : "Sem evidência"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {caso.esperado ? <Marca ok={caso.acerto_top1} /> : <em className="text-xs">n/a</em>}
                      </TableCell>
                      <TableCell className="text-center">
                        {caso.esperado ? <Marca ok={caso.acerto_top3} /> : <em className="text-xs">n/a</em>}
                      </TableCell>
                      <TableCell className="text-center">
                        {caso.esperado ? <Marca ok={caso.lexical_top1} /> : <em className="text-xs">n/a</em>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Modo: {dados.modo}</span>
            <span>Modelo: {dados.modelo}</span>
            <span>Coleção: {dados.colecao}</span>
            <span>Executado em {new Date(dados.executado_em_utc).toLocaleString("pt-BR")}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Marca({ ok }: { ok: boolean }) {
  return (
    <span className="inline-flex justify-center">
      {ok ? (
        <IconeVerificado className={cn("h-4 w-4 text-emerald-600")} aria-label="Correto" />
      ) : (
        <IconeIncorreto className={cn("h-4 w-4 text-destructive")} aria-label="Incorreto" />
      )}
    </span>
  )
}
