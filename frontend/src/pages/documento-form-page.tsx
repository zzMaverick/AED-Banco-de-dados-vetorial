import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { EstadoErro } from "@/components/estado-erro"
import {
  IconeAdicionar,
  IconeExcluir,
  IconeSetaAbaixo,
  IconeSetaAcima,
  IconeVerificado,
} from "@/components/icons"
import { PageHeader } from "@/components/page-header"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useAsync } from "@/hooks/use-async"
import { api, ErroApi, type DocumentoEntrada } from "@/lib/api"
import { cn } from "@/lib/utils"

const NOVA_AREA = "__nova__"

const VAZIO: DocumentoEntrada = {
  id: "",
  titulo: "",
  area: "",
  fonte: "",
  versao: "1.0",
  secoes: [{ titulo: "", texto: "" }],
}

function semChave(mapa: Record<string, string>, chave: string): Record<string, string> {
  if (!mapa[chave]) return mapa
  const copia = { ...mapa }
  delete copia[chave]
  return copia
}

function validar(doc: DocumentoEntrada): Record<string, string> {
  const erros: Record<string, string> = {}
  if (!doc.id.trim()) erros.id = "Informe o identificador."
  else if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(doc.id.trim()))
    erros.id = "Use apenas letras, números, ponto, hífen ou sublinhado."

  if (!doc.titulo.trim()) erros.titulo = "Informe o título."
  if (!doc.area.trim()) erros.area = "Informe a área."
  if (!doc.fonte.trim()) erros.fonte = "Informe a fonte."
  if (!doc.versao.trim()) erros.versao = "Informe a versão."

  doc.secoes.forEach((secao, indice) => {
    if (!secao.titulo.trim()) erros[`secoes.${indice}.titulo`] = "Informe o título da seção."
    if (!secao.texto.trim()) erros[`secoes.${indice}.texto`] = "Informe o texto da seção."
  })
  return erros
}

export function DocumentoFormPage() {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()
  const editando = Boolean(id)

  const areas = useAsync(() => api.areas(), [])
  const origem = useAsync(async () => (id ? (await api.documento(id)).documento : null), [id])

  const [documento, setDocumento] = useState<DocumentoEntrada>(VAZIO)
  const [areaLivre, setAreaLivre] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (origem.dados) setDocumento(origem.dados)
  }, [origem.dados])

  const areasConhecidas = useMemo(() => areas.dados?.areas ?? [], [areas.dados])

  function alterarCampo(campo: keyof Omit<DocumentoEntrada, "secoes">, valor: string) {
    setDocumento((atual) => ({ ...atual, [campo]: valor }))
    setErros((atual) => semChave(atual, campo))
  }

  function alterarSecao(indice: number, campo: "titulo" | "texto", valor: string) {
    setDocumento((atual) => {
      const secoes = atual.secoes.map((secao, posicao) =>
        posicao === indice ? { ...secao, [campo]: valor } : secao,
      )
      return { ...atual, secoes }
    })
    setErros((atual) => semChave(atual, `secoes.${indice}.${campo}`))
  }

  function adicionarSecao() {
    setDocumento((atual) => ({ ...atual, secoes: [...atual.secoes, { titulo: "", texto: "" }] }))
  }

  function removerSecao(indice: number) {
    setDocumento((atual) => ({
      ...atual,
      secoes: atual.secoes.filter((_, posicao) => posicao !== indice),
    }))
    setErros({})
  }

  function moverSecao(indice: number, deslocamento: number) {
    setDocumento((atual) => {
      const destino = indice + deslocamento
      if (destino < 0 || destino >= atual.secoes.length) return atual
      const secoes = [...atual.secoes]
      ;[secoes[indice], secoes[destino]] = [secoes[destino], secoes[indice]]
      return { ...atual, secoes }
    })
    setErros({})
  }

  async function salvar() {
    const limpo: DocumentoEntrada = {
      ...documento,
      id: documento.id.trim(),
      titulo: documento.titulo.trim(),
      area: documento.area.trim(),
      fonte: documento.fonte.trim(),
      versao: documento.versao.trim(),
      secoes: documento.secoes.map((secao) => ({
        titulo: secao.titulo.trim(),
        texto: secao.texto.trim(),
      })),
    }

    const encontrados = validar(limpo)
    if (Object.keys(encontrados).length > 0) {
      setErros(encontrados)
      toast.error("Verifique os campos destacados.")
      return
    }

    setSalvando(true)
    setErros({})
    try {
      if (editando && id) {
        await api.atualizarDocumento(id, limpo)
        toast.success(`Documento ${limpo.id} atualizado.`)
      } else {
        await api.criarDocumento(limpo)
        toast.success(`Documento ${limpo.id} criado.`, { description: "Já está disponível na busca." })
      }
      navegar("/documentos")
    } catch (falha) {
      if (falha instanceof ErroApi && Object.keys(falha.campos).length > 0) {
        setErros(falha.campos)
        toast.error(falha.message)
      } else {
        toast.error(editando ? "Não foi possível salvar as alterações." : "Não foi possível criar o documento.", {
          description: (falha as Error).message,
        })
      }
    } finally {
      setSalvando(false)
    }
  }

  if (editando && origem.carregando) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (editando && origem.erro) {
    return (
      <div className="space-y-5">
        <PageHeader titulo="Editar documento" voltar={{ para: "/documentos", rotulo: "Documentos" }} />
        <EstadoErro mensagem={origem.erro} aoTentarNovamente={origem.recarregar} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        titulo={editando ? `Editar ${documento.id}` : "Novo documento"}
        descricao={
          editando
            ? "As alterações são reindexadas apenas para este documento."
            : "O documento entra na base e no índice de busca assim que for salvo."
        }
        voltar={{ para: "/documentos", rotulo: "Documentos" }}
        acao={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navegar("/documentos")} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={() => void salvar()} disabled={salvando}>
              <IconeVerificado className="h-4 w-4" />
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar documento"}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Identificação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Campo rotulo="Identificador" erro={erros.id} dica={editando ? undefined : "Ex.: PR013"}>
            <Input
              value={documento.id}
              onChange={(evento) => alterarCampo("id", evento.target.value)}
              disabled={editando}
              placeholder="PR013"
              aria-invalid={Boolean(erros.id)}
            />
          </Campo>

          <Campo rotulo="Versão" erro={erros.versao}>
            <Input
              value={documento.versao}
              onChange={(evento) => alterarCampo("versao", evento.target.value)}
              placeholder="1.0"
              aria-invalid={Boolean(erros.versao)}
            />
          </Campo>

          <Campo rotulo="Título" erro={erros.titulo} className="sm:col-span-2">
            <Input
              value={documento.titulo}
              onChange={(evento) => alterarCampo("titulo", evento.target.value)}
              placeholder="Título do procedimento"
              aria-invalid={Boolean(erros.titulo)}
            />
          </Campo>

          <Campo rotulo="Área" erro={erros.area}>
            {areaLivre ? (
              <div className="flex gap-2">
                <Input
                  value={documento.area}
                  onChange={(evento) => alterarCampo("area", evento.target.value)}
                  placeholder="Nome da nova área"
                  aria-invalid={Boolean(erros.area)}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAreaLivre(false)
                    alterarCampo("area", "")
                  }}
                >
                  Voltar
                </Button>
              </div>
            ) : (
              <Select
                value={areasConhecidas.includes(documento.area) ? documento.area : ""}
                onValueChange={(valor) => {
                  if (valor === NOVA_AREA) {
                    setAreaLivre(true)
                    alterarCampo("area", "")
                    return
                  }
                  alterarCampo("area", valor)
                }}
              >
                <SelectTrigger aria-invalid={Boolean(erros.area)}>
                  <SelectValue placeholder="Selecione a área" />
                </SelectTrigger>
                <SelectContent>
                  {areasConhecidas.map((nome) => (
                    <SelectItem key={nome} value={nome}>
                      {nome}
                    </SelectItem>
                  ))}
                  <SelectItem value={NOVA_AREA}>Nova área…</SelectItem>
                </SelectContent>
              </Select>
            )}
          </Campo>

          <Campo rotulo="Fonte" erro={erros.fonte}>
            <Input
              value={documento.fonte}
              onChange={(evento) => alterarCampo("fonte", evento.target.value)}
              placeholder="Origem do documento"
              aria-invalid={Boolean(erros.fonte)}
            />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Seções</CardTitle>
            <Badge variant="muted">{documento.secoes.length}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={adicionarSecao}>
            <IconeAdicionar className="h-4 w-4" />
            Adicionar seção
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {erros.secoes ? <p className="text-sm text-destructive">{erros.secoes}</p> : null}

          {documento.secoes.map((secao, indice) => (
            <div key={indice} className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Seção {indice + 1}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Mover para cima"
                    aria-label={`Mover a seção ${indice + 1} para cima`}
                    disabled={indice === 0}
                    onClick={() => moverSecao(indice, -1)}
                  >
                    <IconeSetaAcima className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Mover para baixo"
                    aria-label={`Mover a seção ${indice + 1} para baixo`}
                    disabled={indice === documento.secoes.length - 1}
                    onClick={() => moverSecao(indice, 1)}
                  >
                    <IconeSetaAbaixo className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    title="Remover seção"
                    aria-label={`Remover a seção ${indice + 1}`}
                    disabled={documento.secoes.length === 1}
                    onClick={() => removerSecao(indice)}
                  >
                    <IconeExcluir className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`secao-titulo-${indice}`}>Título da seção</Label>
                  <Input
                    id={`secao-titulo-${indice}`}
                    value={secao.titulo}
                    onChange={(evento) => alterarSecao(indice, "titulo", evento.target.value)}
                    placeholder="Ex.: Abertura da solicitação"
                    aria-invalid={Boolean(erros[`secoes.${indice}.titulo`])}
                  />
                  {erros[`secoes.${indice}.titulo`] ? (
                    <p className="text-xs text-destructive">{erros[`secoes.${indice}.titulo`]}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`secao-texto-${indice}`}>Texto</Label>
                  <Textarea
                    id={`secao-texto-${indice}`}
                    value={secao.texto}
                    onChange={(evento) => alterarSecao(indice, "texto", evento.target.value)}
                    placeholder="Conteúdo da seção"
                    className="min-h-[140px]"
                    aria-invalid={Boolean(erros[`secoes.${indice}.texto`])}
                  />
                  {erros[`secoes.${indice}.texto`] ? (
                    <p className="text-xs text-destructive">{erros[`secoes.${indice}.texto`]}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function Campo({
  rotulo,
  erro,
  dica,
  className,
  children,
}: {
  rotulo: string
  erro?: string
  dica?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{rotulo}</Label>
      {children}
      {erro ? <p className="text-xs text-destructive">{erro}</p> : null}
      {!erro && dica ? <p className="text-xs text-muted-foreground">{dica}</p> : null}
    </div>
  )
}
