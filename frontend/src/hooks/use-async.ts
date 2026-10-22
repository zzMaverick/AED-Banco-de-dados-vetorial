import { useCallback, useEffect, useState } from "react"

interface Resultado<T> {
  dados: T | null
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): Resultado<T> {
  const [dados, setDados] = useState<T | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const executar = useCallback(fn, deps)

  const carregar = useCallback(() => {
    let ativo = true
    setCarregando(true)
    setErro(null)
    executar()
      .then((resultado) => {
        if (ativo) setDados(resultado)
      })
      .catch((falha: Error) => {
        if (ativo) setErro(falha.message)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [executar])

  useEffect(() => carregar(), [carregar])

  return { dados, carregando, erro, recarregar: carregar }
}
