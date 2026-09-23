/**
 * Puerta de acceso del equipo (/login-workers).
 *
 * Mismo formulario que la de clientes (LoginForm.jsx) y mismo endpoint:
 * quien entra por aquí puede ser trabajador o encargado. Cambia el pie,
 * porque por esta puerta nadie se registra solo: las cuentas del equipo
 * las crea la empresa, así que a quien no tiene se le ofrece la
 * candidatura.
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
