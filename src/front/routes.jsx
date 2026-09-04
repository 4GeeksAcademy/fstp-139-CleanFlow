// Import necessary components and functions from react-router-dom.

import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import { PublicLayout } from "./pages/web/PublicLayout";
import { AuthLayout } from "./pages/web/AuthLayout";
import { Home } from "./pages/web/Home";
import { Single } from "./pages/web/Single";
import { Demo } from "./pages/web/Demo";
import { Register } from "./pages/web/Register";
import { Login } from "./pages/web/Login";
import { ProtectedRoutes } from "./pages/dashboard/ProtectedRoutes";
import { DashboardLayout } from "./pages/dashboard/DashboardLayout";
import { RoleRoute } from "./pages/dashboard/RoleRoute";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* ---------- ZONA PÚBLICA ---------- */}
      <Route path="/" element={<PublicLayout />} errorElement={<h1>Not found!</h1>}>
        <Route index element={<Home />} />
        <Route path="single/:theId" element={<Single />} />
        <Route path="demo" element={<Demo />} />
        <Route path="register" element={<Register />} />
      </Route>

      {/* ---------- LOGIN: layout propio, sin navbar/footer ---------- */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* ---------- ZONA PRIVADA ---------- */}
      {/* ProtectedRoutes vigila que haya sesión; no aporta URL. */}
      <Route element={<ProtectedRoutes />}>
        <Route path="/dashboard" element={<DashboardLayout />}>

          {/* COMUNES A TODOS LOS ROLES. Sin RoleRoute a propósito:
              son el punto de entrada de todo el mundo, así que
              tienen que ser accesibles siempre, pase lo que pase. */}
          <Route index element={<h1>Inicio</h1>} />
          <Route path="profile" element={<h1>Mi cuenta</h1>} /> 

          {/* ---- SECCIONES DE CLIENT ---- */}
          <Route element={<RoleRoute allowed={["client"]} />}>
            <Route path="contracted-services" element={<h1>Mis servicios</h1>} />
          </Route>

          {/* ---- SECCIONES DE WORKER ---- */}
          <Route element={<RoleRoute allowed={["worker"]} />}>
            <Route path="tasks" element={<h1>Mis tareas</h1>} />
          </Route>

          {/* ---- SECCIONES DE MANAGER ----
              Un mismo RoleRoute puede envolver varias rutas:
              no hace falta repetir el guardián en cada una. */}
          <Route element={<RoleRoute allowed={["manager"]} />}>
            <Route path="workers" element={<h1>Trabajadores</h1>} />
            <Route path="services" element={<h1>Servicios</h1>} />
            <Route path="shifts" element={<h1>Turnos</h1>} />
          </Route>

          {/* ---- CÓMO AÑADIR UNA SECCIÓN NUEVA ----

              1) Crea tu página en src/front/pages/dashboard/
              2) Impórtala arriba
              3) Sustituye el <h1> provisional por tu componente:
                    <Route path="tasks" element={<Tasks />} />

              Si la sección es para VARIOS roles, no dupliques la ruta:
              añade el rol al array del guardián.

                    <Route element={<RoleRoute allowed={["client", "manager"]} />}>
                      <Route path="invoices" element={<Invoices />} />
                    </Route>

              Los path van SIN barra inicial: son relativos a /dashboard.
              Si la sección la ve todo el mundo, va suelta como profile,
              sin ningún RoleRoute. */}

        </Route>
      </Route>

      <Route path="*" element={<h1>Not found!</h1>} />
    </>
  )
);