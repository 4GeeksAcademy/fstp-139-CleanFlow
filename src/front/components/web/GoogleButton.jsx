/**
 * BOTÓN DE ENTRAR CON GOOGLE.
 *
 * Lo pinta Google, no nosotros: su script dibuja el botón dentro del
 * hueco que le damos. Su guía de marca no permite maquetarlo por
 * nuestra cuenta ni teñirlo con los colores de CleanFlow.
 *
 * Cuando el usuario elige su cuenta, Google devuelve un token firmado.
 * Aquí solo se reenvía al backend, que es quien comprueba la firma: el
 * correo que llegue del navegador nunca se usa tal cual.
 *
 * Sirve para entrar y para registrarse a la vez, porque son lo mismo:
 * si el correo no existe se crea la cuenta, y si existe se entra en ella.
 *
 * Con `onCredential` hace otra cosa: no entra ni navega, solo entrega el
 * token de Google a quien lo pidió. Es lo que usa Ajustes → Seguridad
 * para conectar un Google a una sesión que ya está abierta.
 *
 * Estilos: auth.css (auth-google) o los que le pase `className`.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loginWithGoogle } from "../../services/authService.js";
import useGlobalReducer from "../../hooks/useGlobalReducer.jsx";
import { returnPath } from "../../authPaths.js";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT = "https://accounts.google.com/gsi/client";

/** Carga el script de Google una sola vez, lo pidan las pantallas que lo pidan. */
const loadGoogle = () => new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();

    const already = document.querySelector(`script[src="${SCRIPT}"]`);

    if (already) {
        already.addEventListener("load", resolve);
        already.addEventListener("error", reject);
        return;
    }

    const script = document.createElement("script");

    script.src = SCRIPT;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;

    document.head.appendChild(script);
});

export const GoogleButton = ({ onError, onCredential, className = "auth-google" }) => {
    const { dispatch } = useGlobalReducer();
    const navigate = useNavigate();
    const location = useLocation();

    const box = useRef(null);

    // Las funciones que llegan por props se guardan en una ref y no en
    // las dependencias del efecto. Quien lo usa las escribe en línea, así
    // que cambian de identidad en cada render, y Ajustes se repinta con
    // cada tecla del formulario: con ellas en las dependencias, Google
    // volvería a dibujar su botón una y otra vez.
    const handlers = useRef({ onError, onCredential });
    handlers.current = { onError, onCredential };

    // Mientras se carga el script no hay nada que enseñar. Y si no carga
    // —sin conexión, o un bloqueador— tampoco: mejor que no exista a que
    // haya un botón que no hace nada al pulsarlo.
    const [failed, setFailed] = useState(false);

    // A dónde iba el usuario antes de que lo mandaran al login, con sus
    // parámetros: si no, vuelve a la pantalla correcta pero sin el
    // servicio que venía a contratar.
    const from = returnPath(location.state?.from);

    useEffect(() => {
        if (!CLIENT_ID) {
            console.warn("Falta VITE_GOOGLE_CLIENT_ID: el botón de Google no se pinta.");
            setFailed(true);
            return;
        }

        let alive = true;

        const responder = async ({ credential }) => {
            // Modo "solo entregar": la pantalla que lo pidió decide qué
            // hacer con el token. Aquí no se entra ni se navega.
            if (handlers.current.onCredential) {
                handlers.current.onCredential(credential);
                return;
            }

            const { ok, data } = await loginWithGoogle(credential);

            if (!alive) return;

            if (!ok) {
                handlers.current.onError?.(data.message || "No hemos podido entrar con Google.");
                return;
            }

            dispatch({ type: "LOGIN", payload: { token: data.token, user: data.user } });

            // Sin teléfono no se pasa al panel: la cuenta acaba de nacer
            // con Google, que no lo da, y hace falta para poder avisar al
            // cliente el día del servicio.
            navigate(data.user.needs_phone ? "/completar-perfil" : from, { replace: true });
        };

        loadGoogle()
            .then(() => {
                if (!alive || !box.current) return;

                window.google.accounts.id.initialize({
                    client_id: CLIENT_ID,
                    callback: responder,
                });

                window.google.accounts.id.renderButton(box.current, {
                    theme: "outline",
                    size: "large",
                    width: 320,
                    text: "continue_with",
                    locale: "es",
                });
            })
            .catch(() => {
                if (alive) setFailed(true);
            });

        return () => { alive = false; };
    // Solo al montar: volver a inicializar pintaría el botón dos veces.
    }, [dispatch, navigate, from]);

    if (failed) return null;

    return <div className={className} ref={box} />;
};
