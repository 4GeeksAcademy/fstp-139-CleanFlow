/**
 * Pantalla de inicio de sesión.
 *
 * Provisional: el formulario ya vive en components/web/LoginForm.jsx, y
 * esta página desaparece en cuanto existan las dos puertas
 * (/login-clients y /login-workers), en el paso siguiente de WEB-10.
 */

import { Link } from "react-router-dom";
import { LoginForm } from "../../components/web/LoginForm.jsx";


export const Login = () => {
    return (
        <LoginForm
            title="Iniciar sesión"
            subtitle="Accede a tu panel de CleanFlow"
            foot={(state) => (
                <>
                    ¿No tienes una cuenta? <Link to="/register" state={state}>Regístrate</Link>
                </>
            )}
        />
    );
};
