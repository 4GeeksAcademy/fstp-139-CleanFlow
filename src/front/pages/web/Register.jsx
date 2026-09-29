/**
 * Pantalla de registro de clientes.
 *
 * Como el login, solo el contenido de la tarjeta: el marco lo pone
 * AuthLayout. Tras el alta abre la sesión sola y vuelve a donde iba el
 * usuario: el catálogo si venía de "Reservar ahora" y, si no, /dashboard.
 *
 * Los estilos son las clases auth-* de auth.css.
 */

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { login, register } from "../../services/authService";
import useGlobalReducer from "../../hooks/useGlobalReducer.jsx";
import { GoogleButton } from "../../components/web/GoogleButton.jsx";


export const Register = () => {
    const navigate = useNavigate();
    const { dispatch } = useGlobalReducer();

    // Lo que dejó ProtectedRoutes al mandar al login: el destino. Entrando
    // al registro por su cuenta no hay, y se va a /dashboard.
    const location = useLocation();
    const from = location.state?.from?.pathname || "/dashboard";

    // Inputs controlados, como en el login: el estado manda, no el DOM.
    const [formData, setFormData] = useState({
        name: "",
        last_name: "",
        email: "",
        phone: "",
        password: ""
    });

    // Error del backend (correo repetido, datos que faltan...) o de conexión.
    const [error, setError] = useState("");

    // El correo ya tiene cuenta, pero creada con Google. No es que
    // esté "pillado": es que la cuenta ya es suya.
    const [useGoogle, setUseGoogle] = useState("");

    // Evita el doble envío y cambia el texto del botón mientras se guarda.
    const [loading, setLoading] = useState(false);

    // Solo controla si la contraseña se ve o no (el botón del ojo), igual
    // que en el login.
    const [showPassword, setShowPassword] = useState(false);

    // Un solo manejador para todos los campos: cada input lleva su `name`.
    const handleChange = (event) => {
        setFormData({
            ...formData,
            [event.target.name]: event.target.value
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (loading) return;

        setError("");
        setUseGoogle("");
        setLoading(true);

        // register() y login() nunca lanzan: devuelven { ok, data }.
        const created = await register(formData);

        if (!created.ok) {
            if (created.data.use_google) {
                setUseGoogle(created.data.message);
                setLoading(false);
                return;
            }

            // Los campos no se borran: así se puede corregir y reintentar.
            // Un solo camino para los dos casos: la API y los fallos de red
            // mandan el mensaje en la misma clave.
            setError(created.data.message || "No se pudo completar el registro");
            setLoading(false);
            return;
        }

        // Cuenta creada: se abre la sesión con los mismos datos, igual que
        // hace Login.jsx, en vez de mandarle a escribirlos otra vez.
        const session = await login(formData.email, formData.password);

        if (!session.ok) {
            // La cuenta existe, pero la sesión no se pudo abrir: al login,
            // con el destino, el correo ya escrito y el aviso de que solo le
            // falta entrar. La contraseña no viaja: la vuelve a escribir.
            // A la puerta de clientes: por aquí solo se registran ellos.
            navigate("/login-clients", {
                replace: true,
                state: { from: location.state?.from, registered: true, email: formData.email },
            });
            return;
        }

        dispatch({
            type: "LOGIN",
            payload: {
                token: session.data.token,
                user: session.data.user,
            },
        });

        // replace: "atrás" no vuelve al formulario con la sesión ya abierta.
        navigate(from, { replace: true });
    };

    return (
        <div className="auth-card">
            <h1 className="auth-title">Crear cuenta</h1>

            <p className="auth-subtitle">
                Regístrate para solicitar y gestionar tus servicios
            </p>

            {useGoogle && (
                <div className="auth-note" role="status">
                    <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
                    <span>
                        <b>Ya tienes una cuenta con este correo.</b> La creaste con
                        Google, así que entra con el botón de arriba. Es la misma
                        cuenta, con tus reservas.
                    </span>
                </div>
            )}

            {error && (
                <div className="auth-alert" role="alert">
                    {error}
                </div>
            )}

            {/* Arriba del formulario: quien vaya a usarlo se ahorra
                rellenar cinco campos. Y es el mismo botón que en el
                login, porque entrar y registrarse con Google son lo
                mismo: si el correo no existe, se crea la cuenta. */}
            <GoogleButton onError={setError} />
            <p className="auth-or">o rellena tus datos</p>

            <form onSubmit={handleSubmit}>
                <div className="auth-field">
                    <label htmlFor="name" className="auth-label">
                        Nombre
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        className="auth-input"
                        placeholder="Tu nombre"
                        autoComplete="given-name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="auth-field">
                    <label htmlFor="last_name" className="auth-label">
                        Apellidos
                    </label>
                    <input
                        type="text"
                        id="last_name"
                        name="last_name"
                        className="auth-input"
                        placeholder="Tus apellidos"
                        autoComplete="family-name"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="auth-field">
                    <label htmlFor="email" className="auth-label">
                        Correo electrónico
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        className="auth-input"
                        placeholder="tucorreo@ejemplo.com"
                        autoComplete="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="auth-field">
                    <label htmlFor="phone" className="auth-label">
                        Teléfono
                    </label>
                    <input
                        type="tel"
                        id="phone"
                        name="phone"
                        className="auth-input"
                        placeholder="600 123 456"
                        autoComplete="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="auth-field">
                    <label htmlFor="password" className="auth-label">
                        Contraseña
                    </label>

                    {/* Mismo ojo que el login: auth-group agrupa el campo y
                        el botón para que el borde y el foco rodeen a los dos. */}
                    <div className="auth-group">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            name="password"
                            className="auth-input"
                            placeholder="Mínimo 6 caracteres"
                            autoComplete="new-password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                        />
                        {/* type="button": dentro del <form>, sin él enviaría
                            el registro. aria-label porque solo lleva un icono. */}
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

                <button type="submit" className="auth-btn" disabled={loading}>
                    {loading ? "Creando cuenta..." : "Crear cuenta"}
                </button>
            </form>

            {/* El mismo destino de vuelta, por si se arrepiente y prefiere
                entrar con una cuenta que ya tiene. */}
            <p className="auth-foot">
                ¿Ya tienes una cuenta? <Link to="/login-clients" state={location.state}>Inicia sesión</Link>
            </p>
        </div>
    );
};