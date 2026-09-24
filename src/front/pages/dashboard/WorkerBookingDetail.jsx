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
import {
    getWorkerBookings,
    uploadTaskPhoto,
    deleteTaskPhoto,
    completeBookingTask,
    startBookingDay,
    finishBookingDay,
    completeBooking,
} from "../../services/bookingService";
import { WorkerStatus } from "../../components/dashboard/worker/WorkerStatus";
import { WorkerTimeline } from "../../components/dashboard/worker/WorkerTimeline";
import { WorkerToday } from "../../components/dashboard/worker/WorkerToday";
import { WorkerWhere } from "../../components/dashboard/worker/WorkerWhere";
import { WorkerTasks } from "../../components/dashboard/worker/WorkerTasks";
import { WorkerActions } from "../../components/dashboard/worker/WorkerActions";
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


    // ---------- SUBIR, BORRAR Y MARCAR ----------

    // Qué tarea está esperando respuesta, para apagar sus botones, y qué
    // foto se está subiendo, como "12-before". Dos datos y no uno: se
    // puede estar subiendo una foto de una tarea y marcando otra.
    const [busyTaskId, setBusyTaskId] = useState(null);
    const [uploading, setUploading] = useState(null);

    /** Cierra sesión si el token caducó. true si no hay que seguir. */
    const expired = (result) => {
        if (result.status !== 401) return false;

        dispatch({ type: "LOGOUT" });
        return true;
    };

    const handlePick = async (task, kind, file) => {
        setUploading(`${task.booking_task_id}-${kind}`);
        setError("");

        const result = await uploadTaskPhoto(task.booking_task_id, kind, file, store.token);

        setUploading(null);

        if (expired(result)) return;

        // Se recarga el servicio entero y no solo la foto: así la tarea
        // llega con sus dos fotos y el botón de cerrar se enciende solo.
        if (result.ok) await load();
        else setError(result.data.message);
    };

    const handleDeletePhoto = async (photo) => {
        setError("");

        const result = await deleteTaskPhoto(photo.media_id, store.token);

        if (expired(result)) return;

        if (result.ok) await load();
        else setError(result.data.message);
    };

    const handleToggle = async (task, completed) => {
        setBusyTaskId(task.booking_task_id);
        setError("");

        const result = await completeBookingTask(task.booking_task_id, store.token, completed);

        setBusyTaskId(null);

        if (expired(result)) return;

        if (result.ok) await load();
        else setError(result.data.message);
    };


    // ---------- EMPEZAR, CERRAR EL DÍA Y FINALIZAR ----------

    // Un solo "ocupado" para las tres: no se puede empezar y finalizar a
    // la vez, y así el botón no se puede pulsar dos veces con mala red.
    const [acting, setActing] = useState(false);

    /**
     * Las tres acciones que mueven el servicio por su línea de tiempo.
     *
     * El día es el de hoy, que es el único que se puede trabajar: el
     * backend rechaza cualquier otro.
     */
    const handleAction = async (action) => {
        const today = madridToday();
        const day = booking.days.find((row) => row.starts_at.slice(0, 10) === today);

        if (!day) return;

        setActing(true);
        setError("");

        const result = action === "start"
            ? await startBookingDay(booking.booking_id, day.booking_day_id, store.token)
            : action === "finishDay"
                ? await finishBookingDay(booking.booking_id, day.booking_day_id, store.token)
                : await completeBooking(booking.booking_id, store.token);

        setActing(false);

        if (expired(result)) return;

        // Las tres devuelven la reserva entera: se pinta la que llega y
        // no hace falta volver a pedirla.
        if (result.ok) setBooking(result.data.booking);
        else setError(result.data.message);
    };

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

                {/* Con la forma de lo que va a llegar: el bloque del día,
                    dos tareas y la columna de consulta. Así la pantalla no
                    pega un salto cuando entra el servicio. */}
                <div className="cf-wdetail__grid">
                    <div className="cf-wdetail__col">
                        <div className="cf-dash-skel" style={{ height: "74px", borderRadius: "12px" }}></div>
                        <div className="cf-dash-skel" style={{ height: "128px", borderRadius: "12px" }}></div>
                    </div>
                    <div className="cf-wdetail__col">
                        <div className="cf-dash-skel" style={{ height: "88px", borderRadius: "12px" }}></div>
                        <div className="cf-dash-skel" style={{ height: "150px", borderRadius: "12px" }}></div>
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

    // Igual que en la tarjeta: sin tramos no hay nada que enseñar, y es
    // preferible el aviso de "no existe" a una pantalla rota.
    const [first] = booking.days;

    if (!first) {
        return (
            <div className="cf-wdetail">
                <Link to={LIST_PATH} className="cf-wdetail__back">
                    <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
                    Mis tareas
                </Link>
                <p className="cf-dash-alert" role="alert">
                    Este servicio no tiene horario asignado. Avisa al encargado.
                </p>
            </div>
        );
    }

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

            {/* Un fallo al subir una foto o al marcar una tarea no debe
                tirar la pantalla: se avisa aquí y el trabajo sigue donde
                estaba. El error de carga tiene su propio bloque arriba. */}
            {error && <p className="cf-dash-alert" role="alert">{error}</p>}

            {/* La columna ancha es donde se toca; la estrecha se consulta. */}
            <div className="cf-wdetail__grid">

                <div className="cf-wdetail__col">
                    <WorkerToday booking={booking} today={madridToday()} />
                    <WorkerTasks
                        booking={booking}
                        busyTaskId={busyTaskId}
                        uploading={uploading}
                        onPick={handlePick}
                        onDeletePhoto={handleDeletePhoto}
                        onToggle={handleToggle}
                    />
                </div>

                <div className="cf-wdetail__col">
                    <WorkerTimeline booking={booking} />
                    <WorkerWhere booking={booking} />
                    <WorkerActions
                        booking={booking}
                        today={madridToday()}
                        busy={acting}
                        onAction={handleAction}
                    />
                </div>

            </div>

        </div>
    );
};