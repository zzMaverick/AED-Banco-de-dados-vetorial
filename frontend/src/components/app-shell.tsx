import { NavLink } from "react-router-dom"

import { IconeAvaliacao, IconeBusca, IconeDocumentos, IconeVetor, Marca } from "@/components/icons"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

const NAVEGACAO = [
  { para: "/", rotulo: "Buscar", icone: IconeBusca, fim: true },
  { para: "/documentos", rotulo: "Documentos", icone: IconeDocumentos, fim: false },
  { para: "/avaliacao", rotulo: "Avaliação", icone: IconeAvaliacao, fim: false },
  { para: "/vetor", rotulo: "Vetor", icone: IconeVetor, fim: false },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="container flex h-14 items-center justify-between gap-4">
          <NavLink to="/" className="flex items-center gap-2.5" aria-label="Procedimentos Internos">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Marca className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">Procedimentos Internos</span>
          </NavLink>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-0.5 md:flex" aria-label="Navegação principal">
              {NAVEGACAO.map(({ para, rotulo, icone: Icone, fim }) => (
                <NavLink
                  key={para}
                  to={para}
                  end={fim}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )
                  }
                >
                  <Icone className="h-4 w-4" />
                  {rotulo}
                </NavLink>
              ))}
            </nav>
            <ThemeToggle />
          </div>
        </div>

        <nav className="container flex gap-0.5 overflow-x-auto pb-2 md:hidden" aria-label="Navegação principal">
          {NAVEGACAO.map(({ para, rotulo, icone: Icone, fim }) => (
            <NavLink
              key={para}
              to={para}
              end={fim}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )
              }
            >
              <Icone className="h-4 w-4" />
              {rotulo}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="container flex-1 py-7">{children}</main>

      <footer className="border-t">
        <div className="container flex h-12 items-center justify-between text-xs text-muted-foreground">
          <span>Procedimentos Internos</span>
          <span>versão 1.0</span>
        </div>
      </footer>
    </div>
  )
}
