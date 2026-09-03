/**
 * Pantalla de inicio de sesión.
 *
 * Solo el contenido de la tarjeta: el marco (fondo, logo, centrado y el
 * enlace de vuelta al inicio) lo pone AuthLayout, que es su layout en
 * routes.jsx. Por eso el login no tiene navbar ni footer.
 *
 * Los estilos son las clases auth-* de auth.css.
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../../services/authService.js";
import useGlobalReducer from "../../hooks/useGlobalReducer.jsx";


export const Login = () => {

    const { dispatch } = useGlobalReducer()
    const navigate = useNavigate();

    // Inputs controlados: React guarda lo que se escribe en su estado y
    // lo devuelve al input por la prop `value`. El estado es la fuente
    // de la verdad, no el DOM.
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Solo controla si la contraseña se ve o no (el botón del ojo).
    const [showPassword, setShowPassword] = useState(false);

    // Mensaje de error del backend (credenciales incorrectas, etc.).
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        // Evita que el navegador recargue la página al enviar el
        // formulario, que es su comportamiento por defecto.
        e.preventDefault();

        // Limpia el error anterior: si no, al reintentar se quedaría el
        // mensaje viejo en pantalla mientras llega la nueva respuesta.
        setError("");

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

        // Siempre a /dashboard, sin mirar el rol: quien decide qué ve
        // cada uno es el sidebar filtrado, no esta pantalla.
        navigate("/dashboard")
    }

    return (
        <div className="auth-card">
            <h1 className="auth-title">Iniciar sesión</h1>
            <p className="auth-subtitle">Accede a tu panel de CleanFlow</p>

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
                        onChange={(e) => setEmail(e.target.value)}
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
                            onChange={(e) => setPassword(e.target.value)}
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

            <p className="auth-foot">
                ¿No tienes una cuenta? <Link to="/register">Regístrate</Link>
            </p>
        </div>
    );
};
