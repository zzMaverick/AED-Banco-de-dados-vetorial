import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"

interface Props {
  titulo: string
  descricao?: string
  className?: string
  acao?: React.ReactNode
  voltar?: { para: string; rotulo: string }
}

export function PageHeader({ titulo, descricao, className, acao, voltar }: Props) {
  return (
    <div className={cn("mb-6 space-y-3", className)}>
      {voltar ? (
        <Link
          to={voltar.para}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {voltar.rotulo}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
          {descricao ? <p className="max-w-2xl text-sm text-muted-foreground">{descricao}</p> : null}
        </div>
        {acao}
      </div>
    </div>
  )
}
