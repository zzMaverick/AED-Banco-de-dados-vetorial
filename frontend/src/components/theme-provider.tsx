import { createContext, useContext, useEffect, useState } from "react"

type Tema = "light" | "dark" | "system"

interface EstadoTema {
  tema: Tema
  definirTema: (tema: Tema) => void
}

const TemaContext = createContext<EstadoTema | null>(null)

interface Props {
  children: React.ReactNode
  defaultTheme?: Tema
  storageKey?: string
}

export function ThemeProvider({ children, defaultTheme = "light", storageKey = "tema" }: Props) {
  const [tema, setTema] = useState<Tema>(() => (localStorage.getItem(storageKey) as Tema) || defaultTheme)

  useEffect(() => {
    const raiz = window.document.documentElement
    raiz.classList.remove("light", "dark")

    const efetivo =
      tema === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : tema

    raiz.classList.add(efetivo)
  }, [tema])

  const definirTema = (novo: Tema) => {
    localStorage.setItem(storageKey, novo)
    setTema(novo)
  }

  return <TemaContext.Provider value={{ tema, definirTema }}>{children}</TemaContext.Provider>
}

export function useTheme() {
  const contexto = useContext(TemaContext)
  if (!contexto) throw new Error("useTheme deve ser usado dentro de ThemeProvider.")
  return contexto
}
