import { IconeAlerta, IconeReindexar } from "@/components/icons"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface Props {
  mensagem: string
  aoTentarNovamente?: () => void
}

export function EstadoErro({ mensagem, aoTentarNovamente }: Props) {
  return (
    <Alert variant="destructive">
      <IconeAlerta />
      <AlertTitle>Não foi possível concluir a operação</AlertTitle>
      <AlertDescription className="mt-2 flex flex-wrap items-center gap-3">
        <span>{mensagem}</span>
        {aoTentarNovamente ? (
          <Button variant="outline" size="sm" onClick={aoTentarNovamente}>
            <IconeReindexar className="h-4 w-4" />
            Tentar novamente
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}
