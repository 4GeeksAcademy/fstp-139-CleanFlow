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
import { cancelCompany } from "../../../services/absenceService";

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

/**
 * Suma días a un "2026-09-30".
 *
 * Con los números sueltos y no con Date.parse: una cadena de solo fecha
 * se interpreta como UTC, y en Madrid eso adelanta el día.
 */
const shiftDay = (iso, days) => {
    const [year, month, day] = iso.split("-").map(Number);
    const moved = new Date(year, month - 1, day + days);

    return [
        moved.getFullYear(),
        String(moved.getMonth() + 1).padStart(2, "0"),
        String(moved.getDate()).padStart(2, "0"),
    ].join("-");
};

// "08:00". Se recorta la cadena en vez de pasarla por Date: las horas
// llegan en hora de Madrid y sin zona, y un Date las movería al huso del
// navegador.
const hourOf = (iso) => iso.slice(11, 16);

/** "martes 30 de septiembre", para el título del día que se está viendo. */
const longDay = (iso) => {
    const [year, month, day] = iso.split("-").map(Number);

    return new Intl.DateTimeFormat("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(new Date(year, month - 1, day));
};

// Los cuatro estados de un día de servicio, en el orden en que pasan.
// El texto va aquí y no en el JSX para que se lean juntos: `label` es
// el de la fila, y `count` el del resumen, en singular y en plural.
const STATES = {
    todo: { label: "Por empezar", count: ["por empezar", "por empezar"] },
    doing: { label: "En curso", count: ["en curso", "en curso"] },
    done: { label: "Finalizado", count: ["finalizado", "finalizados"] },
    not_done: { label: "No realizado", count: ["no realizado", "no realizados"] },
};

/** "1 finalizado · 2 en curso", saltándose los que están a cero. */
const dayLine = (summary) => Object.entries(STATES)
    .filter(([key]) => summary[key] > 0)
    .map(([key, state]) => `${summary[key]} ${state.count[summary[key] === 1 ? 0 : 1]}`)
    .join(" · ");

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

    // Hoy, para saber si lo elegido es ayer, hoy o mañana.
    const today = madridToday();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // La reserva que se está cancelando, con su motivo. null = cerrado.
    const [dropping, setDropping] = useState(null);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

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

    /** Cancela como empresa. El cliente lo verá en Mis servicios. */
    const confirmDrop = async () => {
        setBusy(true);

        const result = await cancelCompany(dropping.booking_id, reason.trim(), store.token);

        setBusy(false);

        if (!result.ok) {
            setError(result.data.message);
            return;
        }

        setDropping(null);
        setReason("");

        // El día se vuelve a pedir: la reserva cancelada desaparece de
        // la lista y el resumen baja solo.
        loadDay();
    };

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

            <section className="cf-home__day">

                <div className="cf-home__dayhead">
                    <h2 className="cf-home__t">Cómo va el {longDay(date)}</h2>

                    <div className="cf-home__picks">
                        <button
                            type="button"
                            className="cf-home__chip"
                            aria-pressed={date === shiftDay(today, -1)}
                            onClick={() => setDate(shiftDay(today, -1))}
                        >
                            Ayer
                        </button>
                        <button
                            type="button"
                            className="cf-home__chip"
                            aria-pressed={date === today}
                            onClick={() => setDate(today)}
                        >
                            Hoy
                        </button>
                        <button
                            type="button"
                            className="cf-home__chip"
                            aria-pressed={date === shiftDay(today, 1)}
                            onClick={() => setDate(shiftDay(today, 1))}
                        >
                            Mañana
                        </button>

                        <input
                            type="date"
                            className="cf-home__pick-date"
                            aria-label="Elegir otro día"
                            value={date}
                            onChange={(event) => event.target.value && setDate(event.target.value)}
                        />
                    </div>
                </div>

                {day?.bookings.length > 0 ? (
                    <>
                        <p className="cf-home__sum">{dayLine(day.summary)}</p>

                        {day.bookings.map((service) => (
                            <div className="cf-home__svc" key={service.booking_day_id}>
                                <span className={`cf-home__dot cf-home__dot--${service.state}`} />

                                <span className="cf-home__hour">
                                    {hourOf(service.starts_at)} – {hourOf(service.ends_at)}
                                </span>

                                <span>
                                    {service.service_name}
                                    {service.open_incidents > 0 && (
                                        <span className="cf-home__warn">
                                            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                                            {service.open_incidents === 1
                                                ? "Una incidencia abierta"
                                                : `${service.open_incidents} incidencias abiertas`}
                                        </span>
                                    )}
                                </span>

                                <span className="cf-home__who">
                                    <b>{service.worker_name}</b> · {service.client_name}
                                </span>

                                {/* El estado siempre, y debajo el botón si aún
                                    se puede parar: el punto de color solo no
                                    dice lo suficiente. */}
                                <span className="cf-home__end">
                                    <span>
                                        {STATES[service.state].label}
                                        {service.tasks.total > 0
                                            && ` · ${service.tasks.done} de ${service.tasks.total} tareas`}
                                    </span>

                                    {service.can_cancel && (
                                        <button
                                            type="button"
                                            className="cf-dash-btn cf-dash-btn--sm cf-dash-btn--ghost"
                                            onClick={() => { setReason(""); setDropping(service); }}
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                </span>
                            </div>
                        ))}
                    </>
                ) : (
                    <p className="cf-home__empty">Ese día no hay ningún servicio.</p>
                )}
            </section>

            {/* Cancelar como empresa: el cliente lo verá en Mis servicios,
                así que el motivo importa. */}
            {dropping && (
                <dialog className="cf-dash-modal" open>
                    <div className="cf-dash-modal__body">
                        <span className="cf-dash-modal__icon">
                            <i className="fa-solid fa-ban" aria-hidden="true" />
                        </span>

                        <h2 className="cf-dash-modal__title">
                            ¿Cancelar la reserva n.º {dropping.booking_id}?
                        </h2>

                        <p className="cf-dash-modal__text">
                            {dropping.service_name} de {dropping.client_name}, el{" "}
                            {longDay(date)} a las {hourOf(dropping.starts_at)}. Se liberará
                            el horario y no se puede deshacer.
                        </p>

                        <div className="cf-inc-field">
                            <label className="cf-inc-field__label" htmlFor="drop-reason">
                                Motivo (lo verá el cliente)
                            </label>
                            <textarea
                                id="drop-reason"
                                className="cf-dash-input"
                                rows={3}
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                disabled={busy}
                            ></textarea>
                        </div>

                        <div className="cf-dash-modal__actions">
                            <button
                                type="button"
                                className="cf-dash-btn cf-dash-btn--ghost"
                                onClick={() => setDropping(null)}
                                disabled={busy}
                                autoFocus
                            >
                                Volver
                            </button>

                            <button
                                type="button"
                                className="cf-dash-btn cf-dash-btn--danger"
                                onClick={confirmDrop}
                                disabled={busy}
                            >
                                {busy ? "Cancelando…" : "Confirmar cancelación"}
                            </button>
                        </div>
                    </div>
                </dialog>
            )}

        </div>
    );
};