/**
 * Puerta de acceso del equipo (/login-workers): trabajadores y encargado.
 *
 * El formulario es LoginForm.jsx. Por aquí nadie se registra solo (las
 * cuentas del equipo las crea la empresa), así que el pie ofrece la
 * candidatura en lugar del alta.
 */

import { Link } from "react-router-dom";
import { LoginForm } from "../../components/web/LoginForm.jsx";


export const LoginWorkers = () => {
    return (
        <LoginForm
            title="Área de empleados"
            subtitle="Entra a tu panel de trabajo"
            foot={() => (
                <>
                    ¿Quieres trabajar con nosotros? <Link to="/work-with-us">Envía tu candidatura</Link>
                </>
            )}
        />
    );
};
