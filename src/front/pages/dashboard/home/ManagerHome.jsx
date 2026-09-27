/**
 * INICIO DEL ENCARGADO (#24).
 *
 * El único de los tres inicios que es un panel de verdad: el cliente y
 * el trabajador entran a preguntar "¿qué hago ahora?"; él entra a
 * preguntar "¿cómo va la cosa?".
 *
 * Dos llamadas con vidas distintas: las métricas se piden al entrar y
 * se quedan, y el día se vuelve a pedir al cambiar de fecha y cada
 * minuto (paso 8). Por eso llevan su propio estado cada una.
 *
 * Estilos: dashboard.css, sección 16 (cf-home).
 */

import "../../../dashboard.css";
import { useCallback, useEffect, useState } from "react";
import useGlobalReducer from "../../../hooks/useGlobalReducer";
import { getStats, getDayBookings } from "../../../services/statsService";

/**
 * Hoy en Madrid, como "2026-09-30".
 *
 * Con la zona horaria y no con el reloj del navegador: quien abra el
 * panel desde fuera de España vería el día cambiado, y el backend
 * decide con la hora de Madrid.
 */
export const madridToday = () => new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
}).format(new Date());

export const ManagerHome = () => {
    const { store } = useGlobalReducer();

    const [stats, setStats] = useState(null);
    const [day, setDay] = useState(null);
    const [date, setDate] = useState(madridToday);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Las métricas, una sola vez. No cambian de un minuto para otro y
    // son la consulta cara de las dos.
    useEffect(() => {
        let alive = true;

        const load = async () => {
            const result = await getStats(store.token);

            if (!alive) return;

            if (result.ok) setStats(result.data);
            else setError(result.data.message);

            setLoading(false);
        };

        load();

        // Al salir de la pantalla ya no se escribe en el estado.
        return () => { alive = false; };
    }, [store.token]);

    // El día, cada vez que se cambia de fecha. En useCallback porque en
    // el paso 8 lo llamará también el temporizador.
    const loadDay = useCallback(async () => {
        const result = await getDayBookings(date, store.token);

        if (result.ok) setDay(result.data);
        else setError(result.data.message);
    }, [date, store.token]);

    useEffect(() => { loadDay(); }, [loadDay]);

    if (loading) return <p className="cf-dash-lede">Cargando…</p>;

    if (error) return <p className="cf-dash-alert" role="alert">{error}</p>;

    // PROVISIONAL (pasos 5, 6 y 7): de momento en crudo, para comprobar
    // que los datos llegan antes de maquetarlos.
    return (
        <>
            <p>
                <button type="button" onClick={() => setDate(madridToday())}>Hoy</button>{" "}
                <button type="button" onClick={() => setDate("2026-09-30")}>30 sep</button>{" "}
                <button type="button" onClick={() => setDate("2026-10-05")}>5 oct</button>
            </p>
            <pre style={{ fontSize: "0.75rem", overflow: "auto" }}>
                {JSON.stringify({ stats, day }, null, 2)}
            </pre>
        </>
    );
};