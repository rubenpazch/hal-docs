import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import UsersPage from '@/pages/users/UsersPage'
import UserFormPage from '@/pages/users/UserFormPage'
import NewDocumentPage from '@/pages/documents/NewDocumentPage'
import ArchivosPage from '@/pages/documents/ArchivosPage'
import NuevoArchivoPage from '@/pages/documents/NuevoArchivoPage'
import TramitesPage from '@/pages/tramites/TramitesPage'
import TramiteDetailPage from '@/pages/tramites/TramiteDetailPage'
import MisTramitesPage from '@/pages/tramites/MisTramitesPage'
import AreasPage from '@/pages/areas/AreasPage'
import AreaFormPage from '@/pages/areas/AreaFormPage'
import CertificatesPage from '@/pages/certificates/CertificatesPage'
import UploadCertificatePage from '@/pages/certificates/UploadCertificatePage'
import MesaVirtualPage from '@/pages/mesa-virtual/MesaVirtualPage'
import NuevoTramitePage from '@/pages/mesa-virtual/NuevoTramitePage'
import ConsultaTramitesPage from '@/pages/mesa-virtual/ConsultaTramitesPage'
import ComoFuncionaPage from '@/pages/mesa-virtual/ComoFuncionaPage'
import FlujoDOcumentarioPage from '@/pages/documents/FlujoDOcumentarioPage'
import AdminMesaVirtualPage from '@/pages/admin/AdminMesaVirtualPage'
import AdminMesaVirtualDetailPage from '@/pages/admin/AdminMesaVirtualDetailPage'
import AccesosPage from '@/pages/admin/AccesosPage'
import BandejaDerivadosPage from '@/pages/bandeja/BandejaDerivadosPage'
import ProfilePage from '@/pages/profile/ProfilePage'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout/AppLayout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* ── Mesa Virtual — public routes (no auth required) ─── */}
          <Route path="/mesa-virtual" element={<MesaVirtualPage />} />
          <Route path="/mesa-virtual/nuevo" element={<NuevoTramitePage />} />
          <Route path="/mesa-virtual/consulta" element={<ConsultaTramitesPage />} />
          <Route path="/mesa-virtual/como-funciona" element={<ComoFuncionaPage />} />

          {/* ── Internal system (auth required — all roles) ───────── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tramites" element={<TramitesPage />} />
              <Route path="/tramites/flujo" element={<FlujoDOcumentarioPage />} />
              <Route path="/tramites/mis-tramites" element={<MisTramitesPage />} />
              <Route path="/tramites/:id" element={<TramiteDetailPage />} />
              <Route path="/tramites/nuevo" element={<NewDocumentPage />} />
              <Route path="/documentos" element={<ArchivosPage />} />
              <Route path="/documentos/nuevo" element={<NuevoArchivoPage />} />
              <Route path="/mis-certificados" element={<CertificatesPage />} />
              <Route path="/mis-certificados/nuevo" element={<UploadCertificatePage />} />
              <Route path="/bandeja/derivados" element={<BandejaDerivadosPage />} />
              <Route path="/mi-perfil" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* ── Admin / Manager only ──────────────────────────────── */}
          <Route element={<ProtectedRoute requiredRoles={['admin', 'manager']} />}>
            <Route element={<AppLayout />}>
              <Route path="/gestion/usuarios" element={<UsersPage />} />
              <Route path="/gestion/usuarios/nuevo" element={<UserFormPage />} />
              <Route path="/gestion/usuarios/:id/editar" element={<UserFormPage />} />
              <Route path="/gestion/areas" element={<AreasPage />} />
              <Route path="/gestion/areas/nuevo" element={<AreaFormPage />} />
              <Route path="/gestion/areas/:id/editar" element={<AreaFormPage />} />
              <Route path="/admin/mesa-virtual" element={<AdminMesaVirtualPage />} />
              <Route path="/admin/mesa-virtual/:id" element={<AdminMesaVirtualDetailPage />} />
              <Route path="/admin/accesos" element={<AccesosPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}
