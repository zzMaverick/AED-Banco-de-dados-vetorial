import { cn, formatarSimilaridade } from "@/lib/utils"

interface Props {
  valor: number
  limiar: number
  className?: string
}

export function BarraSimilaridade({ valor, limiar, className }: Props) {
  const porcentagem = Math.max(0, Math.min(1, valor)) * 100
  const limiarPorcentagem = Math.max(0, Math.min(1, limiar)) * 100
  const aceito = valor >= limiar

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Similaridade de cosseno</span>
        <span className={cn("font-medium tabular-nums", aceito ? "text-primary" : "text-muted-foreground")}>
          {formatarSimilaridade(valor)}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted" role="presentation">
        <div
          className={cn("h-full rounded-full", aceito ? "bg-primary" : "bg-muted-foreground/50")}
          style={{ width: `${porcentagem}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-foreground/60"
          style={{ left: `${limiarPorcentagem}%` }}
          title={`Limiar configurado: ${formatarSimilaridade(limiar)}`}
        />
      </div>
    </div>
  )
}
