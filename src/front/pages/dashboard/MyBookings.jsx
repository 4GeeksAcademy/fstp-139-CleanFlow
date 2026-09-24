/**
 * MIS SERVICIOS · el listado del cliente.
 *
 * Todo lo que ha contratado, repartido en tres pestañas y con el estado
 * de cada servicio a la vista. Al pulsar una tarjeta se abre su detalle.
 *
 * Solo lee: confirmar, reclamar, valorar y cancelar son otras issues y
 * añadirán sus botones en el detalle, no aquí.
 *
 * Estilos: dashboard.css, sección 9 (cf-myservices y cf-bookcard).
 */

import "../../dashboard.css";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { getMyBookings } from "../../services/bookingService";
import { BookingCard } from "../../components/dashboard/bookings/BookingCard";

// Las tres pestañas, en el orden en que se enseñan.
const TABS = [
    { value: "upcoming", label: "Próximos" },
    { value: "done", label: "Realizados" },
    { value: "cancelled", label: "Cancelados" },
];

// Cuántas barras grises se pintan mientras llega la respuesta.
const SKELETON_ROWS = 3;

export const MyBookings = () => {
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();

    const [bookings, setBookings] = useState([]);
    const [tab, setTab] = useState("upcoming");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");

        const result = await getMyBookings(store.token);

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

    // A qué pestaña va cada estado. "En curso" es un próximo: el servicio
    // todavía está en marcha, aunque haya empezado hoy.
    const tabOf = (status) => {
        if (status === "cancelled") return "cancelled";
        if (status === "completed" || status === "not_done") return "done";
        return "upcoming";
    };

    const shown = bookings.filter((booking) => tabOf(booking.status) === tab);

    // Los contadores cuentan sobre el total, no sobre lo filtrado.
    const counts = bookings.reduce(
        (total, booking) => ({ ...total, [tabOf(booking.status)]: total[tabOf(booking.status)] + 1 }),
        { upcoming: 0, done: 0, cancelled: 0 }
    );

    return (
        <div className="cf-myservices">

            {/* ---------- CABECERA ---------- */}

            <div className="cf-myservices__header">
                <div>
                    {/* El grupo del sidebar al que pertenece la página. */}
                    <p className="cf-dash-eyebrow">Mi cuenta</p>
                    <h1 className="cf-myservices__title">Mis servicios</h1>
                    <p className="cf-myservices__lede">
                        Todo lo que has contratado, en qué punto está y cómo quedó.
                    </p>
                </div>

                <button type="button" className="cf-dash-btn" onClick={() => navigate("/dashboard/book")}>
                    <i className="fa-solid fa-plus" aria-hidden="true"></i>
                    Contratar un servicio
                </button>
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
                <ul className="cf-myservices__list">
                    {Array.from({ length: SKELETON_ROWS }, (_, row) => (
                        <li key={row} aria-hidden="true">
                            <div className="cf-bookcard cf-bookcard--skel">
                                <div className="cf-dash-skel cf-bookcard__skel-date"></div>
                                <div>
                                    <div className="cf-dash-skel cf-bookcard__skel-title"></div>
                                    <div className="cf-dash-skel cf-bookcard__skel-meta"></div>
                                </div>
                                <div className="cf-bookcard__side">
                                    <div className="cf-dash-skel cf-bookcard__skel-state"></div>
                                    <div className="cf-dash-skel cf-bookcard__skel-price"></div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : shown.length === 0 ? (
                <div className="cf-dash-state">
                    <span className="cf-dash-state__icon">
                        <i className="fa-regular fa-calendar" aria-hidden="true"></i>
                    </span>
                    <p className="cf-dash-state__title">Todavía no has contratado nada</p>
                    <p className="cf-dash-state__text">
                        Cuando reserves un servicio lo verás aquí, con su estado y sus fotos.
                    </p>
                    <button type="button" className="cf-dash-btn" onClick={() => navigate("/dashboard/book")}>
                        <i className="fa-solid fa-plus" aria-hidden="true"></i>
                        Contratar un servicio
                    </button>
                </div>
            ) : (
                <ul className="cf-myservices__list">
                    {shown.map((booking) => (
                        <BookingCard
                            key={booking.booking_id}
                            booking={booking}
                            onOpen={() => navigate(`/dashboard/contracted-services/${booking.booking_id}`)}
                        />
                    ))}
                </ul>
            )}

        </div>
    );
};
