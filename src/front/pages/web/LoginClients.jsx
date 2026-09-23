/**
 * Puerta de acceso de los clientes (/login-clients).
 *
 * El formulario es LoginForm.jsx. Aquí solo se decide qué se le ofrece a
 * quien todavía no tiene cuenta: registrarse.
 */

import { Link } from "react-router-dom";
import { LoginForm } from "../../components/web/LoginForm.jsx";


export const LoginClients = () => {
    return (
        <LoginForm
            title="Área de clientes"
            subtitle="Entra para gestionar tus servicios"
            // state: el destino viaja al registro, y tras el alta se
            // vuelve a donde quería ir el usuario (WEB-15).
            foot={(state) => (
                <>
                    ¿No tienes una cuenta? <Link to="/register" state={state}>Regístrate</Link>
                </>
            )}
        />
    );
};
