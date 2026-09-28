/**
 * EL PASO QUE FALTA TRAS ENTRAR CON GOOGLE.
 *
 * Google da nombre, apellido, correo y foto, pero no el teléfono, y en
 * CleanFlow hace falta: es por donde llama quien va a la casa si no
 * encuentra el portal.
 *
 * No se puede saltar. Una cuenta sin teléfono estallaría justo al
 * contratar, que es el peor momento para descubrir que falta un dato.
 *
 * El título dice "Ya casi está" y arriba se ve la cuenta ya creada: el
 * usuario pulsó un botón esperando entrar, y no puede sentir que le han
 * colado un registro por la puerta de atrás.
 *
 * Estilos: auth.css (auth-who y los campos de siempre).
 */

import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer.jsx";
import { setAccountPhone } from "../../services/authService.js";
import { loginPathForRole } from "../../authPaths.js";

export const CompleteProfile = () => {
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();

    const [phone, setPhone] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const user = store.user;

    // ------------------------------------------------------------------
    // QUIÉN PUEDE VER ESTA PANTALLA
    //
    // Vive fuera de /dashboard, así que ProtectedRoutes no la vigila y
    // hay que hacerlo aquí. La comprobación va al pintar y no en un
    // useEffect: así no se llega a ver ni un fotograma de lo que no toca.
    // ------------------------------------------------------------------

    // Sin sesión, a la puerta que le corresponda. Antes se veía la
    // tarjeta con el nombre en blanco y un formulario que solo sabía
    // fallar, porque guardar el teléfono pide token.
    if (!store.token) {
        return <Navigate to={loginPathForRole(store.user?.role)} replace />;
    }

    // Con la cuenta ya completa no hay nada que completar. Aquí llega
    // quien pulsa "Atrás" después de guardar, y quien escribe la URL.
    if (!store.user?.needs_phone) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (saving) return;

        setError("");
        setSaving(true);

        const { ok, data } = await setAccountPhone(phone, store.token);

        setSaving(false);

        if (!ok) {
            setError(data.message || "No se ha podido guardar el teléfono.");
            return;
        }

        // El usuario se repinta con la respuesta: needs_phone pasa a false
        // y la guarda de ProtectedRoutes deja de mandarlo aquí.
        dispatch({ type: "SET_USER", payload: data.user });

        navigate("/dashboard", { replace: true });
    };

    return (
        <div className="auth-card">
            <h1 className="auth-title">Ya casi está</h1>
            <p className="auth-subtitle">
                Solo nos falta un dato para poder ir a tu casa.
            </p>

            {/* Su cuenta, ya creada. Sin esto parecería que está
                empezando un registro de cero. */}
            <div className="auth-who">
                <span className="auth-face">
                    {user?.avatar_url
                        ? <img src={user.avatar_url} alt="" />
                        : <i className="fa-solid fa-user" aria-hidden="true"></i>}
                </span>
                <span>
                    <p className="auth-who-name">{user?.name} {user?.last_name}</p>
                    <p className="auth-who-mail">{user?.email}</p>
                </span>
            </div>

            {error && <div className="auth-alert" role="alert">{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="auth-field">
                    <label htmlFor="phone" className="auth-label">Teléfono</label>
                    <input
                        id="phone"
                        type="tel"
                        className="auth-input"
                        placeholder="611 22 33 44"
                        autoComplete="tel"
                        autoFocus
                        value={phone}
                        onChange={(event) => {
                            setPhone(event.target.value);
                            setError("");
                        }}
                    />
                    {/* El porqué, aquí mismo: pedir un teléfono sin decir
                        para qué es lo que hace que la gente escriba
                        números falsos. */}
                    <p className="auth-hint">
                        Lo usa quien vaya a limpiar si no encuentra el portal o
                        llega antes de tiempo. No lo usamos para nada más.
                    </p>
                </div>

                <button type="submit" className="auth-btn" disabled={saving}>
                    {saving ? "Guardando…" : "Empezar"}
                </button>
            </form>
        </div>
    );
};
