/**
 * MIS TAREAS · el listado del trabajador.
 *
 * Lo que tiene asignado, empezando por lo de hoy. Al pulsar un servicio
 * se abre su detalle, que es donde se trabaja: empezar, cerrar tareas
 * con sus fotos y finalizar.
 *
 * Aquí solo se mira. Marcar tareas y finalizar vivían antes en esta
 * misma pantalla; ahora están en el detalle, con su línea de tiempo.
 *
 * Estilos: dashboard.css, sección 10 (cf-mytasks y cf-wcard).
 */

import "../../dashboard.css";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { getWorkerBookings } from "../../services/bookingService";
import { WorkerBookingCard } from "../../components/dashboard/worker/WorkerBookingCard";

// Las dos pestañas, en el orden en que se enseñan, con lo que dice cada
// una cuando se queda vacía.
const TABS = [
    { value: "upcoming", label: "Próximos", empty: "No tienes ningún servicio asignado." },
    { value: "done", label: "Realizados", empty: "Aquí aparecerán tus servicios en cuanto los cierres." },
];

// Cuántas barras grises se pintan mientras llega la respuesta.
const SKELETON_ROWS = 3;

/**
 * Hoy, en hora de Madrid y como "2026-09-24".
 *
 * Se calcula con la zona horaria y no con el reloj del navegador: un
 * trabajador de vacaciones fuera vería el día cambiado, y el backend
 * decide con la hora de Madrid.
 */
const madridToday = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());

    return parts;
};

/** A qué pestaña va cada estado. En curso todavía es un próximo. */
const tabOf = (status) =>
    status === "completed" || status === "not_done" || status === "cancelled"
        ? "done"
        : "upcoming";

export const MisReservasTrabajador = () => {
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();

    const [bookings, setBookings] = useState([]);
    const [tab, setTab] = useState("upcoming");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const today = madridToday();

    const load = useCallback(async () => {
        setLoading(true);
        setError("");

        const result = await getWorkerBookings(store.token);

        // Sesión caducada: se cierra aquí y ProtectedRoutes hace el resto.
        if (result.status === 401) {
            setLoading(false);
            dispatch({ type: "LOGOUT" });
            return;
        }

        if (result.ok) setBookings(result.data.bookings);
        else setError(result.data.message);

        setLoading(false);
    }, [store.token, dispatch]);

    useEffect(() => { load(); }, [load]);

    // Próximos: primero el de hoy, que es el único que se puede empezar,
    // y después por fecha. Realizados: al revés, lo último arriba.
    const shown = bookings
        .filter((booking) => tabOf(booking.status) === tab)
        .sort((one, two) => {
            const a = one.days[0].starts_at;
            const b = two.days[0].starts_at;

            if (tab === "done") return b.localeCompare(a);

            const aToday = a.slice(0, 10) === today;
            const bToday = b.slice(0, 10) === today;

            if (aToday !== bToday) return aToday ? -1 : 1;

            return a.localeCompare(b);
        });

    const counts = bookings.reduce(
        (total, booking) => ({ ...total, [tabOf(booking.status)]: total[tabOf(booking.status)] + 1 }),
        { upcoming: 0, done: 0 }
    );

    return (
        <div className="cf-mytasks">

            {/* ---------- CABECERA ---------- */}

            <div className="cf-mytasks__header">
                <div>
                    {/* El grupo del sidebar al que pertenece la página. */}
                    <p className="cf-dash-eyebrow">Mi trabajo</p>
                    <h1 className="cf-mytasks__title">Mis tareas</h1>
                    <p className="cf-mytasks__lede">
                        Lo que tienes asignado, empezando por lo de hoy.
                    </p>
                </div>
            </div>

            {error && <p className="cf-dash-alert" role="alert">{error}</p>}

            {/* ---------- PESTAÑAS ----------
                Las mismas del catálogo. aria-pressed y no role="tab":
                son filtros de una sola lista. */}

            <div className="cf-services__tabs">
                {TABS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        className="cf-services__tab"
                        aria-pressed={tab === option.value}
                        onClick={() => setTab(option.value)}
                    >
                        {option.label}
                        <span className="cf-services__count">{counts[option.value]}</span>
                    </button>
                ))}
            </div>

            {/* ---------- LISTA ---------- */}

            {loading ? (
                <ul className="cf-mytasks__list">
                    {Array.from({ length: SKELETON_ROWS }, (_, row) => (
                        <li key={row} aria-hidden="true">
                            <div className="cf-wcard cf-wcard--skel">
                                <div className="cf-dash-skel cf-wcard__skel-date"></div>
                                <div>
                                    <div className="cf-dash-skel cf-wcard__skel-title"></div>
                                    <div className="cf-dash-skel cf-wcard__skel-meta"></div>
                                </div>
                                <div className="cf-dash-skel cf-wcard__skel-foot"></div>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : shown.length === 0 ? (
                <div className="cf-dash-state">
                    <span className="cf-dash-state__icon">
                        <i className="fa-regular fa-calendar" aria-hidden="true"></i>
                    </span>
                    <p className="cf-dash-state__title">Nada por aquí</p>
                    <p className="cf-dash-state__text">
                        {TABS.find((option) => option.value === tab).empty}
                    </p>
                </div>
            ) : (
                <ul className="cf-mytasks__list">
                    {shown.map((booking) => (
                        <WorkerBookingCard
                            key={booking.booking_id}
                            booking={booking}
                            today={today}
                            onOpen={() => navigate(`/dashboard/tasks/${booking.booking_id}`)}
                        />
                    ))}
                </ul>
            )}

        </div>
    );
};
