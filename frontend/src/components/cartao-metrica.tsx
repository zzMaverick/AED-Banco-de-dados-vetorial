import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Props {
  rotulo: string
  valor: string
  descricao?: string
  icone?: React.ReactNode
  className?: string
}

export function CartaoMetrica({ rotulo, valor, descricao, icone, className }: Props) {
  return (
    <Card className={className}>
      <CardContent className="flex items-start gap-4 p-5">
        {icone ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icone}
          </span>
        ) : null}
        <div className={cn("space-y-1", !icone && "space-y-0.5")}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{rotulo}</p>
          <p className="text-2xl font-semibold tabular-nums">{valor}</p>
          {descricao ? <p className="text-xs text-muted-foreground">{descricao}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}
