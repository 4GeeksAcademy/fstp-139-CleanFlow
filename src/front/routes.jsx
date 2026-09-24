/**
 * RUTAS DE LA APP.
 *
 * Web pública, login y registro, y zona privada (/dashboard).
 * La zona privada pide sesión (ProtectedRoutes) y cada sección, su rol (RoleRoute).
 */

import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import { PublicLayout } from "./pages/web/PublicLayout";
import { AuthLayout } from "./pages/web/AuthLayout";
import { Home } from "./pages/web/Home";
import { Register } from "./pages/web/Register";
import { MisReservasTrabajador } from "./pages/dashboard/MisReservasTrabajador";
import { WorkerBookingDetail } from "./pages/dashboard/WorkerBookingDetail";
import { LoginClients } from "./pages/web/LoginClients";
import { LoginWorkers } from "./pages/web/LoginWorkers";
import { WorkWithUs } from "./pages/web/WorkWithUs";
import { ProtectedRoutes } from "./pages/dashboard/ProtectedRoutes";
import { DashboardLayout } from "./pages/dashboard/DashboardLayout";
import { RoleRoute } from "./pages/dashboard/RoleRoute";
import { ManageTasks } from "./pages/dashboard/ManageTasks";
import { ManageServices } from "./pages/dashboard/ManageServices";
import { ListadoTrabajadores } from "./pages/dashboard/ListadoTrabajadores";
import { ListadoTurnos } from "./pages/dashboard/ListadoTurnos";
import { EditarTrabajador } from "./pages/dashboard/EditarTrabajador";
import { ServiceCatalog } from "./pages/dashboard/ServiceCatalog";
import { BookingPanel } from "./pages/dashboard/booking/BookingPanel";
import { AccountLayout } from "./pages/dashboard/account/AccountLayout";
import { AccountDetails } from "./pages/dashboard/account/AccountDetails";
import { AccountSecurity } from "./pages/dashboard/account/AccountSecurity";
import { AccountAddresses } from "./pages/dashboard/account/AccountAddresses";
import { AffectedBookings } from "./pages/dashboard/AffectedBookings";
import { ListadoIncidencias } from "./pages/dashboard/ListadoIncidencias";
import { MyBookings } from "./pages/dashboard/MyBookings";
import { BookingDetail } from "./pages/dashboard/BookingDetail";
import { WorkerAbsencesPage } from "./pages/dashboard/WorkerAbsencesPage";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* ---------- ZONA PÚBLICA ---------- */}
      <Route path="/" element={<PublicLayout />} errorElement={<h1>Not found!</h1>}>
        <Route index element={<Home />} />
        <Route path="work-with-us" element={<WorkWithUs />} />
      </Route>

      {/* ---------- ACCESO Y REGISTRO: layout propio, sin navbar ni footer ----------
          Dos puertas y un solo formulario: las dos llaman al mismo
          POST /api/login. Cambian el título y lo que se le ofrece a quien
          todavía no tiene cuenta (WEB-10). */}
      <Route element={<AuthLayout />}>
        <Route path="login-clients" element={<LoginClients />} />
        <Route path="login-workers" element={<LoginWorkers />} />
        <Route path="register" element={<Register />} />
      </Route>

      {/* ---------- ZONA PRIVADA ---------- */}
      {/* ProtectedRoutes vigila que haya sesión; no aporta URL. */}
      <Route element={<ProtectedRoutes />}>
        <Route path="/dashboard" element={<DashboardLayout />}>

          {/* ---- COMUNES A TODOS LOS ROLES ----
              Sin RoleRoute a propósito: son la entrada de todo el mundo. */}
          <Route index element={<h1>Inicio</h1>} />

          {/* Ajustes de la cuenta: un marco con pestañas y una ruta por
              apartado, para poder enlazar cada uno por separado.
              Direcciones solo para client: no contratan ni el encargado ni
              el trabajador. */}
          <Route path="profile" element={<AccountLayout />}>
            <Route index element={<AccountDetails />} />
            <Route path="security" element={<AccountSecurity />} />
            <Route element={<RoleRoute allowed={["client"]} />}>
              <Route path="addresses" element={<AccountAddresses />} />
            </Route>
          </Route>

          {/* ---- SECCIONES DE CLIENT ----
              service-catalog es un contrato: "Reservar ahora" (WEB-15) apunta
              aquí. No confundir con services-catalog, la del encargado. */}
          <Route element={<RoleRoute allowed={["client"]} />}>
            <Route path="service-catalog" element={<ServiceCatalog />} />
            {/* book es otro contrato: "Contratar" del catálogo llega aquí
                con ?servicio=<slug>. */}
            <Route path="book" element={<BookingPanel />} />
            <Route path="contracted-services" element={<MyBookings />} />
            {/* El detalle de una reserva, dentro del mismo RoleRoute: si
                se declara fuera, se cuela cualquier rol. */}
            <Route path="contracted-services/:bookingId" element={<BookingDetail />} />
          </Route>

          {/* ---- SECCIONES DE WORKER ---- */}
          <Route element={<RoleRoute allowed={["worker"]} />}>
            <Route path="tasks" element={<MisReservasTrabajador />} />
            {/* El detalle, dentro del mismo RoleRoute: si se declara
                fuera, se cuela cualquier rol. */}
            <Route path="tasks/:bookingId" element={<WorkerBookingDetail />} />
          </Route>

          {/* ---- SECCIONES DE MANAGER ----
              Un mismo RoleRoute envuelve varias rutas.
              tasks-catalog y no tasks: tasks ya es la ruta del trabajador. */}
          <Route element={<RoleRoute allowed={["manager"]} />}>
            <Route path="incidents" element={<ListadoIncidencias />} />
            <Route path="workers" element={<ListadoTrabajadores />} />
            <Route path="affected-bookings" element={<AffectedBookings />} />
            <Route
              path="workers/:workerId/edit"
              element={<EditarTrabajador />}
            />
            <Route
              path="workers/:workerId/absences"
              element={<WorkerAbsencesPage />}
            />
            <Route
              path="workers/new"
              element={<EditarTrabajador />}
            />
            <Route path="shifts" element={<ListadoTurnos />} />
            <Route path="services-catalog" element={<ManageServices />} />
            <Route path="tasks-catalog" element={<ManageTasks />} />
          </Route>

          {/* ---- CÓMO AÑADIR UNA SECCIÓN NUEVA ----

              1) Crea tu página en src/front/pages/dashboard/ e impórtala arriba.
              2) Cambia el <h1> provisional por tu componente, o añade la ruta
                 dentro del RoleRoute de su rol:
                    <Route path="shifts" element={<Shifts />} />
              3) Añade su enlace a LINKS en components/dashboard/Sidebar.jsx.

              ¿Para VARIOS roles? No dupliques la ruta: añade el rol al array.
                    <Route element={<RoleRoute allowed={["client", "manager"]} />}>
                      <Route path="invoices" element={<Invoices />} />
                    </Route>

              Los path van SIN barra inicial (son relativos a /dashboard) y no
              pueden repetirse entre roles. Si la ve todo el mundo, va suelta
              como profile, sin RoleRoute. */}

        </Route>
      </Route>

      <Route path="*" element={<h1>Not found!</h1>} />
    </>
  )
);
