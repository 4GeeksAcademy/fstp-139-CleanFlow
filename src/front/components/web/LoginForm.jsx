/**
 * FORMULARIO DE INICIO DE SESIÓN.
 *
 * Lo usan las dos puertas (/login-clients y /login-workers), que
 * autentican igual: el mismo POST /api/login, que no mira el rol. Solo
 * cambian los textos, y por eso llegan por props:
 *
 *   title / subtitle: la cabecera de la tarjeta
 *   foot(state):      el pie, al que se le pasa el state de la navegación
 *                     para que el enlace conserve el destino (WEB-15)
 *
 * El marco (fondo, logo, centrado y "Volver al inicio") lo pone
 * AuthLayout. Estilos: las clases auth-* de auth.css.
 */

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login } from "../../services/authService.js";
import useGlobalReducer from "../../hooks/useGlobalReducer.jsx";


export const LoginForm = ({ title, subtitle, foot }) => {

    const { dispatch } = useGlobalReducer()
    const navigate = useNavigate();
    const location = useLocation();

    // Datos que ProtectedRoutes deja en el `state` de la navegación al
    // echar aquí al usuario. No viajan en la URL, así que no se pueden
    // falsificar con un enlace preparado.
    //
    // `from`: la ruta que intentaba abrir. Si llegó al login por su
    // cuenta no hay state, y se usa /dashboard. El ?. es imprescindible:
    // entrando directo a una puerta, state y from son undefined.
    const from = location.state?.from?.pathname || "/dashboard";

    // Inputs controlados: React guarda lo que se escribe en su estado y
    // lo devuelve al input por la prop `value`. El estado es la fuente
    // de la verdad, no el DOM.
    // Viniendo del registro, el correo llega ya escrito (WEB-15).
    const [email, setEmail] = useState(location.state?.email || "");
    const [password, setPassword] = useState("");

    // Solo controla si la contraseña se ve o no (el botón del ojo).
    const [showPassword, setShowPassword] = useState(false);

    // Mensaje de error del backend (credenciales incorrectas, etc.).
    const [error, setError] = useState("");

    // Aviso de sesión caducada. Se inicializa con lo que venga en el
    // state de la navegación y se guarda en estado propio para poder
    // ocultarlo en cuanto el usuario reaccione (al reintentar el login).
    const [expired, setExpired] = useState(Boolean(location.state?.expired));

    // Aviso de cuenta creada: llega así desde el registro cuando la sesión
    // no se pudo abrir sola. Se retira igual que el de sesión caducada.
    const [registered, setRegistered] = useState(Boolean(location.state?.registered));

    const handleSubmit = async (e) => {
        // Evita que el navegador recargue la página al enviar el
        // formulario, que es su comportamiento por defecto.
        e.preventDefault();

        // Limpia el error anterior: si no, al reintentar se quedaría el
        // mensaje viejo en pantalla mientras llega la nueva respuesta.
        setError("");

        // El usuario ya ha reaccionado a los avisos (sesión caducada o
        // cuenta creada): se retiran para que no compitan con el error
        // que pueda venir ahora.
        setExpired(false);
        setRegistered(false);

        // authService devuelve { ok, data }: ok dice si la respuesta fue
        // correcta, data trae el cuerpo.
        const { ok, data } = await login(email, password)
        if (!ok) {
            setError(data.error)
            return
        }

        // Un solo dispatch con token y usuario. El reducer se encarga de
        // guardarlos también en localStorage: la escritura vive ahí y no
        // aquí, para que store y disco no puedan desincronizarse.
        dispatch({
            type: "LOGIN",
            payload: {
                token: data.token,
                user: data.user
            }
        })

        // Vuelta a donde iba el usuario, o a /dashboard si venía directo.
        // No se mira el rol: quien decide qué ve cada uno es el sidebar
        // filtrado, y si la sección guardada no le corresponde, RoleRoute
        // lo devolverá a /dashboard.
        //
        // replace: true para que el botón "atrás" no traiga de vuelta el
        // formulario de login con la sesión ya iniciada.
        navigate(from, { replace: true })
    }

    return (
        <div className="auth-card">
            <h1 className="auth-title">{title}</h1>
            <p className="auth-subtitle">{subtitle}</p>

            {/* Aviso de sesión caducada. Solo aparece si el usuario llega
                aquí porque su token dejó de valer, no al entrar al login
                por su cuenta. */}
            {expired && (
                <div className="auth-notice" role="status">
                    Tu sesión ha expirado, vuelve a iniciar sesión
                </div>
            )}

            {/* Aviso de cuenta creada. Solo aparece cuando el registro fue
                bien pero la sesión no se pudo abrir sola (WEB-15). */}
            {registered && (
                <div className="auth-notice" role="status">
                    Tu cuenta se ha creado. Inicia sesión con tu correo y tu contraseña para continuar.
                </div>
            )}

            {/* Solo se pinta si hay error. role="alert" hace que los
                lectores de pantalla lo anuncien al aparecer. */}
            {error && <div className="auth-alert" role="alert">{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="auth-field">
                    {/* htmlFor apunta al id del input: al pulsar la
                        etiqueta, el cursor va al campo. */}
                    <label htmlFor="email" className="auth-label">Correo electrónico</label>
                    <input
                        type="email"
                        className="auth-input"
                        id="email"
                        placeholder="tucorreo@ejemplo.com"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setError("");
                        }}
                    />
                </div>

                <div className="auth-field">
                    <label htmlFor="password" className="auth-label">Contraseña</label>

                    {/* auth-group agrupa input y ojo: el borde y el
                        contorno de foco los lleva este contenedor, para
                        que al escribir rodeen a los dos como una pieza. */}
                    <div className="auth-group">
                        {/* El tipo cambia solo: "password" oculta el texto,
                            "text" lo muestra. Eso es todo el truco del ojo. */}
                        <input
                            type={showPassword ? "text" : "password"}
                            className="auth-input"
                            id="password"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value)
                                setError("");
                            }}
                        />
                        {/* type="button" es obligatorio: dentro de un <form>, un
                            <button> sin type es "submit" y enviaría el login.
                            aria-label porque el botón solo tiene un icono: sin
                            texto, un lector de pantalla no sabría qué hace. */}
                        <button
                            type="button"
                            className="auth-eye"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            aria-pressed={showPassword}
                        >
                            <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                        </button>
                    </div>
                </div>

                {/* Este sí es type="submit": dispara el onSubmit del form,
                    así que también funciona pulsando Enter en un campo. */}
                <button type="submit" className="auth-btn">Iniciar sesión</button>
            </form>

            {/* Hueco para los accesos externos ("Entrar con Google"), que
                van en su propia issue. Va aquí, entre el botón y el pie. */}

            {/* El pie lo pone cada puerta: no es lo mismo lo que se le
                ofrece a un cliente que a alguien del equipo.
                state={location.state}: el destino viaja con el enlace, y
                tras el alta se vuelve a donde quería ir (WEB-15). */}
            <p className="auth-foot">{foot(location.state)}</p>
        </div>
    );
};
