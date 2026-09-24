/**
 * DETALLE DE UN SERVICIO ASIGNADO.
 *
 * La pantalla donde el trabajador trabaja: en qué punto está, qué tiene
 * que hacer, dónde y con quién, y los botones para empezar, cerrar las
 * tareas con sus fotos y finalizar.
 *
 * Aquí aterrizará también la #18, con su botón de abrir incidencia.
 *
 * Estilos: dashboard.css, sección 10 (cf-wdetail).
 */

import "../../dashboard.css";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { getWorkerBookings } from "../../services/bookingService";
import { WorkerStatus } from "../../components/dashboard/worker/WorkerStatus";
import { WorkerTimeline } from "../../components/dashboard/worker/WorkerTimeline";
import { WorkerToday } from "../../components/dashboard/worker/WorkerToday";
import { WorkerWhere } from "../../components/dashboard/worker/WorkerWhere";
import { longDate, timeOf } from "../../components/dashboard/bookings/bookingFormat";

const LIST_PATH = "/dashboard/tasks";

/** Hoy en Madrid, como "2026-09-24". El backend decide con esa hora. */
const madridToday = () =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());

export const WorkerBookingDetail = () => {
    const { bookingId } = useParams();
    const { store, dispatch } = useGlobalReducer();

    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    /**
     * Trae el servicio. Se deja en un useCallback y no dentro del efecto
     * porque los botones de empezar y finalizar lo van a reutilizar para
     * refrescar la pantalla después de cada acción.
     */
    const load = useCallback(async () => {
        const result = await getWorkerBookings(store.token);

        // Sesión caducada: se cierra aquí y ProtectedRoutes hace el resto.
        if (result.status === 401) {
            setLoading(false);
            dispatch({ type: "LOGOUT" });
            return;
        }

        if (!result.ok) {
            setError(result.data.message);
            setLoading(false);
            return;
        }

        // El backend solo devuelve los servicios del trabajador del token,
        // así que buscar aquí ya es buscar entre los suyos.
        const found = result.data.bookings.find(
            (row) => String(row.booking_id) === bookingId
        );

        setBooking(found || null);
        setLoading(false);
    }, [bookingId, store.token, dispatch]);

    useEffect(() => { load(); }, [load]);

    // ---------- MIENTRAS LLEGA EL SERVICIO ----------

    if (loading) {
        return (
            <div className="cf-wdetail" aria-busy="true">
                <div className="cf-dash-skel" style={{ width: "110px", height: "13px" }}></div>
                <div className="cf-wdetail__header">
                    <div style={{ flex: 1 }}>
                        <div className="cf-dash-skel" style={{ width: "44%", height: "24px" }}></div>
                        <div className="cf-dash-skel" style={{ width: "60%", height: "13px", marginTop: "10px" }}></div>
                    </div>
                </div>
            </div>
        );
    }

    // ---------- LO QUE PUEDE SALIR MAL ----------

    if (error) {
        return (
            <div className="cf-wdetail">
                <Link to={LIST_PATH} className="cf-wdetail__back">
                    <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
                    Mis tareas
                </Link>
                <p className="cf-dash-alert" role="alert">{error}</p>
            </div>
        );
    }

    // Servicio que no existe, o que es de otro trabajador. El mensaje es
    // el mismo a propósito: decir "no es tuyo" ya confirmaría que existe.
    if (!booking) {
        return (
            <div className="cf-wdetail">
                <div className="cf-dash-state">
                    <span className="cf-dash-state__icon">
                        <i className="fa-regular fa-calendar-xmark" aria-hidden="true"></i>
                    </span>
                    <p className="cf-dash-state__title">Este servicio no existe</p>
                    <p className="cf-dash-state__text">
                        Puede que se haya cancelado o que el enlace no sea correcto.
                    </p>
                    <Link to={LIST_PATH} className="cf-dash-btn">Volver a mis tareas</Link>
                </div>
            </div>
        );
    }

    // ---------- EL SERVICIO ----------

    const [first] = booking.days;

    return (
        <div className="cf-wdetail">

            <Link to={LIST_PATH} className="cf-wdetail__back">
                <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
                Mis tareas
            </Link>

            <div className="cf-wdetail__header">
                <div>
                    <p className="cf-dash-eyebrow">Mi trabajo</p>
                    <h1 className="cf-wdetail__title">
                        {booking.service?.name || "Servicio no disponible"}
                    </h1>
                    <p className="cf-wdetail__sub">
                        {longDate(first.starts_at)} · {timeOf(first.starts_at)} – {timeOf(first.ends_at)}
                    </p>
                </div>

                <WorkerStatus status={booking.status} />
            </div>

            {/* La columna ancha es donde se toca; la estrecha se consulta. */}
            <div className="cf-wdetail__grid">

                <div className="cf-wdetail__col">
                    <WorkerToday booking={booking} today={madridToday()} />
                </div>

                <div className="cf-wdetail__col">
                    <WorkerTimeline booking={booking} />
                    <WorkerWhere booking={booking} />
                </div>

            </div>

        </div>
    );
};