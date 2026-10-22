import { IconeFonte } from "@/components/icons"
import { BarraSimilaridade } from "@/components/barra-similaridade"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { TrechoResultado } from "@/lib/api"

interface Props {
  trecho: TrechoResultado
  posicao: number
  limiar: number
  aceito: boolean
}

export function ResultadoCard({ trecho, posicao, limiar, aceito }: Props) {
  return (
    <Card className={aceito ? "border-primary/30" : "opacity-90"}>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {posicao}
            </span>
            <div>
              <h3 className="text-base font-semibold leading-tight">{trecho.titulo}</h3>
              <p className="text-xs text-muted-foreground">
                Seção: {trecho.secao} · {trecho.trecho_id}
              </p>
            </div>
          </div>
          <Badge variant={aceito ? "default" : "muted"}>{aceito ? "Acima do limiar" : "Abaixo do limiar"}</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{trecho.area}</Badge>
          <Badge variant="outline">versão {trecho.versao}</Badge>
          <Badge variant="outline">{trecho.documento_id}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/90">{trecho.texto}</p>

        <BarraSimilaridade valor={trecho.similaridade} limiar={limiar} />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <IconeFonte className="h-3.5 w-3.5" />
            {trecho.fonte}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
