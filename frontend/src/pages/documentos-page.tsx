import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { EstadoErro } from "@/components/estado-erro"
import { EstadoVazio } from "@/components/estado-vazio"
import {
  IconeAdicionar,
  IconeBusca,
  IconeEditar,
  IconeExcluir,
  IconeReindexar,
  IconeVazio,
} from "@/components/icons"
import { PageHeader } from "@/components/page-header"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { api, type DocumentoResumo } from "@/lib/api"

const TODAS = "__todas__"

export function DocumentosPage() {
  const { dados, carregando, erro, recarregar } = useAsync(() => api.documentos(), [])
  const navegar = useNavigate()

  const [area, setArea] = useState(TODAS)
  const [termo, setTermo] = useState("")
  const [emOperacao, setEmOperacao] = useState<string | null>(null)
  const [paraExcluir, setParaExcluir] = useState<DocumentoResumo | null>(null)

  const areas = useMemo(() => {
    const conjunto = new Set((dados?.documentos ?? []).map((doc) => doc.area))
    return Array.from(conjunto).sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [dados])

  const filtrados = useMemo(() => {
    const busca = termo.trim().toLowerCase()
    return (dados?.documentos ?? []).filter((doc) => {
      if (area !== TODAS && doc.area !== area) return false
      if (!busca) return true
      return (
        doc.id.toLowerCase().includes(busca) ||
        doc.titulo.toLowerCase().includes(busca) ||
        doc.fonte.toLowerCase().includes(busca)
      )
    })
  }, [dados, area, termo])

  async function reindexar(doc: DocumentoResumo) {
    setEmOperacao(`reindexar:${doc.id}`)
    try {
      const resposta = await api.reindexarDocumento(doc.id)
      toast.success(`Documento ${doc.id} reindexado.`, {
        description: `${resposta.trechos} trecho(s) no índice.`,
      })
    } catch (falha) {
      toast.error("Não foi possível reindexar o documento.", { description: (falha as Error).message })
    } finally {
      setEmOperacao(null)
    }
  }

  async function reindexarTudo() {
    setEmOperacao("reindexar:base")
    try {
      const resposta = await api.reindexarBase()
      toast.success("Índice reconstruído.", {
        description: `${resposta.documentos} documento(s) e ${resposta.trechos} trecho(s).`,
      })
      recarregar()
    } catch (falha) {
      toast.error("Não foi possível reconstruir o índice.", { description: (falha as Error).message })
    } finally {
      setEmOperacao(null)
    }
  }

  async function excluir() {
    if (!paraExcluir) return
    const alvo = paraExcluir
    setEmOperacao(`excluir:${alvo.id}`)
    try {
      await api.removerDocumento(alvo.id)
      toast.success(`Documento ${alvo.id} removido.`, { description: "Os vetores também foram excluídos." })
      setParaExcluir(null)
      recarregar()
    } catch (falha) {
      toast.error("Não foi possível excluir o documento.", { description: (falha as Error).message })
    } finally {
      setEmOperacao(null)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Documentos"
        descricao="Procedimentos que a busca pode recuperar."
        acao={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void reindexarTudo()}
              disabled={emOperacao === "reindexar:base"}
            >
              <IconeReindexar className="h-4 w-4" />
              {emOperacao === "reindexar:base" ? "Reindexando..." : "Reindexar base"}
            </Button>
            <Button onClick={() => navegar("/documentos/novo")}>
              <IconeAdicionar className="h-4 w-4" />
              Novo documento
            </Button>
          </div>
        }
      />

      {erro ? <EstadoErro mensagem={erro} aoTentarNovamente={recarregar} /> : null}

      {!erro ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <IconeBusca className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={termo}
              onChange={(evento) => setTermo(evento.target.value)}
              placeholder="Buscar por identificador, título ou fonte"
              aria-label="Buscar documento"
              className="pl-9"
            />
          </div>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger className="w-[200px]" aria-label="Filtrar por área">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas as áreas</SelectItem>
              {areas.map((nome) => (
                <SelectItem key={nome} value={nome}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <Card>
        {carregando ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((chave) => (
              <Skeleton key={chave} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">Identificador</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="w-[160px]">Área</TableHead>
                <TableHead className="w-[90px]">Versão</TableHead>
                <TableHead className="w-[90px] text-center">Seções</TableHead>
                <TableHead className="w-[140px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-mono text-xs">{doc.id}</TableCell>
                  <TableCell>
                    <span className="font-medium">{doc.titulo}</span>
                    <span className="block text-xs text-muted-foreground">{doc.fonte}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{doc.area}</Badge>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{doc.versao}</TableCell>
                  <TableCell className="text-center text-sm tabular-nums">{doc.secoes.length}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Editar"
                        aria-label={`Editar ${doc.id}`}
                        onClick={() => navegar(`/documentos/${encodeURIComponent(doc.id)}/editar`)}
                      >
                        <IconeEditar className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Reindexar"
                        aria-label={`Reindexar ${doc.id}`}
                        disabled={emOperacao === `reindexar:${doc.id}`}
                        onClick={() => void reindexar(doc)}
                      >
                        <IconeReindexar className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Excluir"
                        aria-label={`Excluir ${doc.id}`}
                        onClick={() => setParaExcluir(doc)}
                      >
                        <IconeExcluir className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {!carregando && !erro && filtrados.length === 0 ? (
          <div className="p-5">
            <EstadoVazio
              icone={IconeVazio}
              titulo={dados?.documentos.length ? "Nenhum documento encontrado" : "Nenhum documento cadastrado"}
              descricao={
                dados?.documentos.length
                  ? "Ajuste a busca ou o filtro de área para ver outros procedimentos."
                  : "Cadastre o primeiro procedimento para que ele apareça na busca."
              }
            >
              {!dados?.documentos.length ? (
                <Button onClick={() => navegar("/documentos/novo")}>
                  <IconeAdicionar className="h-4 w-4" />
                  Novo documento
                </Button>
              ) : null}
            </EstadoVazio>
          </div>
        ) : null}

        {!carregando && filtrados.length > 0 ? (
          <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground">
            <span>
              {filtrados.length} de {dados?.total ?? 0} documentos
            </span>
            <Link to="/" className="font-medium text-primary hover:underline">
              Ir para a busca
            </Link>
          </div>
        ) : null}
      </Card>

      <AlertDialog open={Boolean(paraExcluir)} onOpenChange={(aberto) => !aberto && setParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento {paraExcluir?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              O documento sai da base e os vetores dos seus trechos são removidos do índice. A busca deixa de
              recuperá-lo e a operação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={emOperacao?.startsWith("excluir:")}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={emOperacao?.startsWith("excluir:")}
              onClick={(evento) => {
                evento.preventDefault()
                void excluir()
              }}
            >
              {emOperacao?.startsWith("excluir:") ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
