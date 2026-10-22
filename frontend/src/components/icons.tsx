import type { SVGProps } from "react"

type Props = SVGProps<SVGSVGElement>

function Traco({ children, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function Marca(props: Props) {
  return (
    <Traco {...props}>
      <path d="M12 2.75 4.75 6.9v10.2L12 21.25l7.25-4.15V6.9z" />
      <path d="M4.75 6.9 12 11.05l7.25-4.15" />
      <path d="M12 11.05v10.2" />
    </Traco>
  )
}

export function IconeBusca(props: Props) {
  return (
    <Traco {...props}>
      <circle cx="10.75" cy="10.75" r="6.75" />
      <path d="m15.75 15.75 4.5 4.5" />
      <path d="M7.75 9h6M7.75 12.5h4" />
    </Traco>
  )
}

export function IconeDocumentos(props: Props) {
  return (
    <Traco {...props}>
      <path d="M9 3.75h8.25a2 2 0 0 1 2 2v11.5" />
      <path d="M6.75 7.5h8.5a2 2 0 0 1 2 2v9.75a2 2 0 0 1-2 2h-8.5a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2z" />
      <path d="M8.5 12.25h5M8.5 15.75h3.5" />
    </Traco>
  )
}

export function IconeAvaliacao(props: Props) {
  return (
    <Traco {...props}>
      <path d="M3.5 17.75a8.5 8.5 0 0 1 17 0" />
      <path d="M12 17.75 16.1 12.9" />
      <circle cx="12" cy="17.75" r="1.3" />
    </Traco>
  )
}

export function IconeVetor(props: Props) {
  return (
    <Traco {...props}>
      <path d="M4.75 19.25v-14.5" />
      <path d="M4.75 19.25h15" />
      <path d="M2.65 6.6 4.75 4.5l2.1 2.1" />
      <path d="M17.65 17.15 19.75 19.25l-2.1 2.1" />
      <path d="M4.75 19.25 14.5 8.25" />
      <circle cx="14.5" cy="8.25" r="1.6" />
    </Traco>
  )
}

export function IconeAdicionar(props: Props) {
  return (
    <Traco {...props}>
      <path d="M12 5.25v13.5M5.25 12h13.5" />
    </Traco>
  )
}

export function IconeEditar(props: Props) {
  return (
    <Traco {...props}>
      <path d="M15.5 4.7a2.2 2.2 0 0 1 3.1 3.1L8.1 18.3 4.1 19.4l1.1-4z" />
      <path d="m14.2 6 3.1 3.1" />
    </Traco>
  )
}

export function IconeExcluir(props: Props) {
  return (
    <Traco {...props}>
      <path d="M4.5 6.75h15" />
      <path d="M9.25 6.75V5A1.25 1.25 0 0 1 10.5 3.75h3A1.25 1.25 0 0 1 14.75 5v1.75" />
      <path d="m6.75 6.75.85 12.4A1.9 1.9 0 0 0 9.5 21h5a1.9 1.9 0 0 0 1.9-1.85l.85-12.4" />
      <path d="M10.5 10.75v6M13.5 10.75v6" />
    </Traco>
  )
}

export function IconeReindexar(props: Props) {
  return (
    <Traco {...props}>
      <path d="M4.25 12A7.75 7.75 0 0 1 17.3 6.35" />
      <path d="M19.75 12A7.75 7.75 0 0 1 6.7 17.65" />
      <path d="M17.75 3.25v3.5h-3.5" />
      <path d="M6.25 20.75v-3.5h3.5" />
    </Traco>
  )
}

export function IconeFechar(props: Props) {
  return (
    <Traco {...props}>
      <path d="m6.25 6.25 11.5 11.5M17.75 6.25 6.25 17.75" />
    </Traco>
  )
}

export function IconeCopiar(props: Props) {
  return (
    <Traco {...props}>
      <rect x="9" y="9" width="11.25" height="11.25" rx="2" />
      <path d="M5.75 15h-1A1.75 1.75 0 0 1 3 13.25v-8.5A1.75 1.75 0 0 1 4.75 3h8.5A1.75 1.75 0 0 1 15 4.75v1" />
    </Traco>
  )
}

export function IconeExecutar(props: Props) {
  return (
    <Traco {...props}>
      <path d="M7.75 4.9 18.25 12l-10.5 7.1z" />
    </Traco>
  )
}

export function IconeChevronBaixo(props: Props) {
  return (
    <Traco {...props}>
      <path d="M6.75 9.5 12 14.75l5.25-5.25" />
    </Traco>
  )
}

export function IconeSetaAcima(props: Props) {
  return (
    <Traco {...props}>
      <path d="M12 19.25V5.25" />
      <path d="M6.75 10.5 12 5.25l5.25 5.25" />
    </Traco>
  )
}

export function IconeSetaAbaixo(props: Props) {
  return (
    <Traco {...props}>
      <path d="M12 4.75v14" />
      <path d="M6.75 13.5 12 18.75l5.25-5.25" />
    </Traco>
  )
}

export function IconeSol(props: Props) {
  return (
    <Traco {...props}>
      <circle cx="12" cy="12" r="4.25" />
      <path d="M12 2.75v2M12 19.25v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.75 12h2M19.25 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </Traco>
  )
}

export function IconeLua(props: Props) {
  return (
    <Traco {...props}>
      <path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z" />
    </Traco>
  )
}

export function IconeAlerta(props: Props) {
  return (
    <Traco {...props}>
      <path d="M10.4 4.1 2.9 17.3a1.9 1.9 0 0 0 1.7 2.85h14.8a1.9 1.9 0 0 0 1.7-2.85L13.6 4.1a1.9 1.9 0 0 0-3.2 0z" />
      <path d="M12 9.25v4.25" />
      <path d="M12 16.75h.01" />
    </Traco>
  )
}

export function IconeVerificado(props: Props) {
  return (
    <Traco {...props}>
      <path d="M5.25 12.5 9.75 17l9-9.5" />
    </Traco>
  )
}

export function IconeIncorreto(props: Props) {
  return (
    <Traco {...props}>
      <path d="m7.5 7.5 9 9M16.5 7.5l-9 9" />
    </Traco>
  )
}

export function IconeFonte(props: Props) {
  return (
    <Traco {...props}>
      <path d="M10.5 6.75H7.25a4.75 4.75 0 0 0 0 9.5h3.25" />
      <path d="M13.5 6.75h3.25a4.75 4.75 0 0 1 0 9.5H13.5" />
      <path d="M8.5 11.5h7" />
    </Traco>
  )
}

export function IconeVazio(props: Props) {
  return (
    <Traco {...props}>
      <path d="M4 13.25h4l1.4 2.5h5.2l1.4-2.5h4" />
      <path d="M6.4 13.25 7.9 6.6a1.6 1.6 0 0 1 1.55-1.25h5.1a1.6 1.6 0 0 1 1.55 1.25l1.5 6.65" />
      <path d="M4 13.25v4.75A1.75 1.75 0 0 0 5.75 19.75h12.5A1.75 1.75 0 0 0 20 18v-4.75" />
    </Traco>
  )
}

export function IconeSemResultado(props: Props) {
  return (
    <Traco {...props}>
      <circle cx="10.75" cy="10.75" r="6.75" />
      <path d="m15.75 15.75 4.5 4.5" />
      <path d="m8 8 5.5 5.5M13.5 8 8 13.5" />
    </Traco>
  )
}

export function IlustracaoBoasVindas({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 150" fill="none" className={className} aria-hidden="true" role="presentation">
      <rect
        x="30"
        y="16"
        width="104"
        height="120"
        rx="12"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="2"
      />
      <path
        d="M58 42h48M58 60h48M58 78h32"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx="128"
        cy="96"
        r="30"
        stroke="currentColor"
        strokeOpacity="0.85"
        strokeWidth="3"
        fill="hsl(var(--background))"
      />
      <path
        d="m150 118 18 16"
        stroke="currentColor"
        strokeOpacity="0.85"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M176 34 198 58M176 34l-10 26M166 60l32-2"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="1.5"
      />
      <circle cx="176" cy="34" r="5" fill="currentColor" fillOpacity="0.25" />
      <circle cx="198" cy="58" r="4" fill="currentColor" fillOpacity="0.18" />
      <circle cx="166" cy="60" r="3.5" fill="currentColor" fillOpacity="0.18" />
    </svg>
  )
}
