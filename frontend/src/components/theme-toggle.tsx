import { IconeLua, IconeSol } from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"

export function ThemeToggle() {
  const { definirTema } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Alternar tema">
          <IconeSol className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <IconeLua className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => definirTema("light")}>Claro</DropdownMenuItem>
        <DropdownMenuItem onClick={() => definirTema("dark")}>Escuro</DropdownMenuItem>
        <DropdownMenuItem onClick={() => definirTema("system")}>Seguir o sistema</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
