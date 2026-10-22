import type { ComponentType } from "react"

import { cn } from "@/lib/utils"

interface Props {
  icone: ComponentType<{ className?: string }>
  titulo: string
  descricao: string
  className?: string
  children?: React.ReactNode
}

export function EstadoVazio({ icone: Icone, titulo, descricao, className, children }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icone className="h-6 w-6" />
      </span>
      <h3 className="text-base font-semibold">{titulo}</h3>
      <p className="mt-1 max-w-lg text-sm text-muted-foreground">{descricao}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  )
}
