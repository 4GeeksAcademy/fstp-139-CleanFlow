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
 * Estilos: dashboard.css, sección 14 (cf-home).
 */

import "../../../dashboard.css";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

/** "Domingo 27 de septiembre", para la cabecera del hero. */
export const longToday = () => {
    const text = new Intl.DateTimeFormat("es-ES", {
        timeZone: "Europe/Madrid",
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(new Date());

    return `${text[0].toUpperCase()}${text.slice(1)}`;
};

// Sin céntimos: en un titular, 4.280,00 € se lee peor que 4.280 €.
const EUROS = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
});

// El ancho de cada trozo de la barra. En porcentaje y no en píxeles:
// los tres reparten el total sin que importe cuánto mide.
const share = (part, total) => `${total ? (part / total) * 100 : 0}%`;

/** La frase del hero: el titular, no los números. Esos van en el bento. */
const summaryLine = ({ bookings }) => {
    if (bookings.active === 0) return "No hay ninguna reserva viva ahora mismo.";

    return bookings.active === 1
        ? "Hay 1 reserva viva en la agenda."
        : `Hay ${bookings.active} reservas vivas en la agenda.`;
};

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

    // ---------- LO QUE SE PINTA ----------

    if (loading) return <div className="cf-dash-skel" style={{ height: 180 }} />;

    if (error) return <p className="cf-dash-alert" role="alert">{error}</p>;

    // Solo se enseña lo que pide algo. Un "0 incidencias" ocupa el sitio
    // de lo que sí importa.
    const inbox = [
        { key: "affected", n: stats.inbox.affected, to: "/dashboard/affected-bookings", one: "reserva afectada", many: "reservas afectadas", hot: true },
        { key: "incidents", n: stats.inbox.incidents, to: "/dashboard/incidents", one: "incidencia", many: "incidencias", hot: true },
        { key: "applications", n: stats.inbox.applications, to: "/dashboard/applications", one: "candidatura", many: "candidaturas", hot: false },
        // TODO (#47): los mensajes de contacto. El número ya viene en
        // /api/stats, pero todavía no hay pantalla a la que enlazar.
    ].filter((tray) => tray.n > 0);

    return (
        <div className="cf-home">

            <section className="cf-home__hero">
                <div className="cf-home__in">
                    <div>
                        <p className="cf-home__date">{longToday()}</p>
                        <h1 className="cf-home__hi">Hola, {store.user?.name}</h1>
                        <p className="cf-home__sub">{summaryLine(stats)}</p>

                        {inbox.length > 0 && (
                            <div className="cf-home__pills">
                                {inbox.map((tray) => (
                                    <Link
                                        key={tray.key}
                                        className={`cf-home__pill${tray.hot ? " cf-home__pill--hot" : ""}`}
                                        to={tray.to}
                                    >
                                        <b>{tray.n}</b> {tray.n === 1 ? tray.one : tray.many}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="cf-home__money">
                        <span className="cf-home__tag">Este mes</span>
                        <p className="cf-home__fig">{EUROS.format(stats.revenue_month)}</p>
                        <p className="cf-home__what">Servicios ya finalizados</p>
                        <p className="cf-home__where">
                            {stats.hours_month} {stats.hours_month === 1 ? "hora vendida" : "horas vendidas"}
                        </p>
                    </div>
                </div>
            </section>

            <div className="cf-home__bento">

                <section className="cf-home__kpi cf-home__kpi--wide">
                    <p className="cf-home__kpi-label">Reservas vivas</p>
                    <span className="cf-home__num">{stats.bookings.active}</span>
                    <span className="cf-home__unit">en la agenda</span>

                    {stats.bookings.active > 0 && (
                        <>
                            <div className="cf-home__bar">
                                <span
                                    className="cf-home__bar-ok"
                                    style={{ width: share(stats.bookings.confirmed, stats.bookings.active) }}
                                />
                                <span
                                    className="cf-home__bar-doing"
                                    style={{ width: share(stats.bookings.in_progress, stats.bookings.active) }}
                                />
                                <span
                                    className="cf-home__bar-wait"
                                    style={{ width: share(stats.bookings.pending, stats.bookings.active) }}
                                />
                            </div>

                            <p className="cf-home__legend">
                                <span>
                                    <i style={{ backgroundColor: "var(--cf-primary)" }} />
                                    {stats.bookings.confirmed} confirmadas
                                </span>
                                <span>
                                    <i style={{ backgroundColor: "var(--cf-accent)" }} />
                                    {stats.bookings.in_progress} en curso
                                </span>
                                <span>
                                    <i style={{ backgroundColor: "var(--cf-border)" }} />
                                    {stats.bookings.pending} pendientes
                                </span>
                            </p>
                        </>
                    )}
                </section>

                <section className="cf-home__kpi">
                    <p className="cf-home__kpi-label">Equipo en activo</p>
                    <span className="cf-home__num">{stats.workers.active}</span>
                    <span className="cf-home__unit">de {stats.workers.total}</span>
                    <p className="cf-home__note">
                        {stats.workers.total === stats.workers.active
                            ? "Nadie de baja ni inactivo"
                            : `${stats.workers.total - stats.workers.active} fuera de servicio`}
                    </p>
                </section>

                <section className="cf-home__kpi">
                    <p className="cf-home__kpi-label">El más pedido este mes</p>
                    {stats.top_service ? (
                        <>
                            <span className="cf-home__num">{stats.top_service.count}</span>
                            <span className="cf-home__unit">
                                {stats.top_service.count === 1 ? "vez" : "veces"}
                            </span>
                            <p className="cf-home__note">{stats.top_service.name}</p>
                        </>
                    ) : (
                        <p className="cf-home__note">Todavía no se ha contratado nada este mes.</p>
                    )}
                </section>

                {/* TODO (#96): la nota global de CleanFlow, cuando el PR de
                    valoraciones llegue a develop. El hueco es este. */}

            </div>

            {/* PROVISIONAL (pasos 6 y 7): el selector de verdad, con ayer,
                hoy, mañana y el calendario, llega en el paso 7. */}
            <p>
                <button type="button" onClick={() => setDate(madridToday())}>Hoy</button>{" "}
                <button type="button" onClick={() => setDate("2026-09-30")}>30 sep</button>{" "}
                <button type="button" onClick={() => setDate("2026-10-05")}>5 oct</button>
            </p>
            <pre style={{ fontSize: "0.75rem", overflow: "auto" }}>
                {JSON.stringify(day, null, 2)}
            </pre>

        </div>
    );
};