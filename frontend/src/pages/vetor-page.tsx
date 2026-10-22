import { useEffect, useMemo, useState } from "react"

import { CartaoMetrica } from "@/components/cartao-metrica"
import { EstadoErro } from "@/components/estado-erro"
import { EstadoVazio } from "@/components/estado-vazio"
import { IconeCopiar, IconeFonte, IconeVazio, IconeVetor, IconeVerificado } from "@/components/icons"
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
import { useAsync } from "@/hooks/use-async"
import { api, type TrechoResumo, type VetorExemplo } from "@/lib/api"
import { cn } from "@/lib/utils"

const AMOSTRA = 32

export function VetorPage() {
  const documentos = useAsync(() => api.documentos(), [])
  const [documentoId, setDocumentoId] = useState("")
  const [trechoId, setTrechoId] = useState("")
  const [copiado, setCopiado] = useState(false)

  const listaDocumentos = useMemo(
    () => [...(documentos.dados?.documentos ?? [])].sort((a, b) => a.id.localeCompare(b.id)),
    [documentos.dados],
  )

  useEffect(() => {
    if (documentoId || !listaDocumentos.length) return
    setDocumentoId(listaDocumentos[0].id)
  }, [documentoId, listaDocumentos])

  const trechosBase = useAsync<{ total: number; trechos: TrechoResumo[] }>(
    () => (documentoId ? api.trechos(documentoId) : Promise.resolve({ total: 0, trechos: [] })),
    [documentoId],
  )

  const listaTrechos = useMemo(
    () => (trechosBase.dados?.trechos ?? []).filter((trecho) => trecho.documento_id === documentoId),
    [trechosBase.dados, documentoId],
  )

  useEffect(() => {
    setTrechoId(listaTrechos.length ? listaTrechos[0].trecho_id : "")
  }, [listaTrechos])

  const vetor = useAsync<VetorExemplo | null>(
    () => (trechoId ? api.vetorExemplo(trechoId) : Promise.resolve(null)),
    [trechoId],
  )

  const dados = vetor.dados
  const maiorModulo = dados ? Math.max(...dados.vetor.map((v) => Math.abs(v))) || 1 : 1
  const semTrechos = Boolean(documentoId) && !trechosBase.carregando && !listaTrechos.length

  async function copiar() {
    if (!dados) return
    await navigator.clipboard.writeText(JSON.stringify(dados, null, 2))
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Vetor"
        descricao="Vetor de 384 dimensões de um trecho indexado da base."
        acao={
          <Button variant="outline" onClick={() => void copiar()} disabled={!dados}>
            {copiado ? <IconeVerificado className="h-4 w-4" /> : <IconeCopiar className="h-4 w-4" />}
            {copiado ? "Copiado" : "Copiar JSON"}
          </Button>
        }
      />

      {documentos.erro ? (
        <EstadoErro mensagem={documentos.erro} aoTentarNovamente={documentos.recarregar} />
      ) : null}

      {documentos.carregando ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : null}

      {!documentos.carregando && !documentos.erro && !listaDocumentos.length ? (
        <EstadoVazio
          icone={IconeVazio}
          titulo="Nenhum documento indexado"
          descricao="Cadastre um documento para inspecionar o vetor de um trecho."
        />
      ) : null}

      {!documentos.carregando && listaDocumentos.length ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="seletor-documento"
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Documento
              </label>
              <Select value={documentoId} onValueChange={setDocumentoId}>
                <SelectTrigger id="seletor-documento">
                  <SelectValue placeholder="Selecione um documento" />
                </SelectTrigger>
                <SelectContent>
                  {listaDocumentos.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.id} · {doc.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="seletor-trecho"
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Trecho
              </label>
              <Select value={trechoId} onValueChange={setTrechoId} disabled={!listaTrechos.length}>
                <SelectTrigger id="seletor-trecho">
                  <SelectValue placeholder="Selecione um trecho" />
                </SelectTrigger>
                <SelectContent>
                  {listaTrechos.map((trecho) => (
                    <SelectItem key={trecho.trecho_id} value={trecho.trecho_id}>
                      {trecho.trecho_id} · {trecho.secao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {trechosBase.erro ? (
            <EstadoErro mensagem={trechosBase.erro} aoTentarNovamente={trechosBase.recarregar} />
          ) : null}

          {vetor.erro ? <EstadoErro mensagem={vetor.erro} aoTentarNovamente={vetor.recarregar} /> : null}

          {semTrechos ? (
            <EstadoVazio
              icone={IconeVetor}
              titulo="Documento sem trechos"
              descricao="Este documento não possui trechos indexados."
            />
          ) : null}

          {vetor.carregando ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((chave) => (
                  <Card key={chave}>
                    <CardContent className="p-5">
                      <Skeleton className="mb-3 h-3 w-1/2" />
                      <Skeleton className="h-8 w-1/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          ) : null}

          {!vetor.carregando && dados ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <CartaoMetrica
                  rotulo="Dimensões"
                  valor={String(dados.dimensoes)}
                  descricao="Tamanho do vetor por trecho"
                  icone={<IconeVetor className="h-5 w-5" />}
                />
                <CartaoMetrica
                  rotulo="Identificador do ponto"
                  valor={`${dados.id.slice(0, 8)}…`}
                  descricao="UUID determinístico do trecho"
                  icone={<IconeFonte className="h-5 w-5" />}
                />
                <CartaoMetrica
                  rotulo="Modelo"
                  valor="MiniLM L12 v2"
                  descricao={dados.metadados.modelo}
                  icone={<IconeVetor className="h-5 w-5" />}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Trecho inspecionado</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Campo rotulo="Título" valor={dados.metadados.titulo} />
                    <Campo rotulo="Área" valor={dados.metadados.area} />
                    <Campo rotulo="Seção" valor={dados.metadados.secao} />
                    <Campo rotulo="Identificador do trecho" valor={dados.metadados.trecho_id} />
                    <Campo rotulo="Fonte" valor={dados.metadados.fonte} />
                    <Campo rotulo="Versão" valor={dados.metadados.versao} />
                  </dl>
                  <div className="mt-4 rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed">
                    {dados.metadados.texto}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Primeiras {AMOSTRA} dimensões</CardTitle>
                  <Badge variant="outline">de {dados.dimensoes}</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex h-32 items-end gap-1">
                    {dados.vetor.slice(0, AMOSTRA).map((valor, indice) => (
                      <div key={indice} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className={cn(
                            "w-full rounded-t transition-all",
                            valor >= 0 ? "bg-primary" : "bg-muted-foreground/50",
                          )}
                          style={{ height: `${(Math.abs(valor) / maiorModulo) * 100}%` }}
                          title={`dimensão ${indice}: ${valor.toFixed(4)}`}
                        />
                      </div>
                    ))}
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Dimensão</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dados.vetor.slice(0, 8).map((valor, indice) => (
                        <TableRow key={indice}>
                          <TableCell className="font-mono text-xs">#{indice}</TableCell>
                          <TableCell className="font-mono text-xs tabular-nums">
                            {valor.toFixed(6)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm">{valor}</dd>
    </div>
  )
}
