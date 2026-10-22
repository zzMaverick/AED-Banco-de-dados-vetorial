import { Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/app-shell"
import { Toaster } from "@/components/ui/sonner"
import { BuscarPage } from "@/pages/buscar-page"
import { DocumentoFormPage } from "@/pages/documento-form-page"
import { DocumentosPage } from "@/pages/documentos-page"
import { AvaliacaoPage } from "@/pages/avaliacao-page"
import { VetorPage } from "@/pages/vetor-page"

export default function App() {
  return (
    <>
      <AppShell>
        <Routes>
          <Route path="/" element={<BuscarPage />} />
          <Route path="/documentos" element={<DocumentosPage />} />
          <Route path="/documentos/novo" element={<DocumentoFormPage />} />
          <Route path="/documentos/:id/editar" element={<DocumentoFormPage />} />
          <Route path="/avaliacao" element={<AvaliacaoPage />} />
          <Route path="/vetor" element={<VetorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <Toaster />
    </>
  )
}
