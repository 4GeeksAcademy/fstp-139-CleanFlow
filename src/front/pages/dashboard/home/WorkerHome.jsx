import "../../../dashboard.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useGlobalReducer from "../../../hooks/useGlobalReducer";
import { getWorkerBookings, startBookingDay } from "../../../services/bookingService";
import { madridToday, madridMoment } from "../../../utils/madridDate";
import { longDate, timeOf } from "../../../components/dashboard/bookings/bookingFormat";
import { WorkerAbsences } from "../../../components/dashboard/home/WorkerAbsences";
import { WorkerRating } from "../../../components/dashboard/worker/WorkerRating";
import { WorkerJourney } from "../../../components/dashboard/home/WorkerJourney";
import { WorkerUpcoming } from "../../../components/dashboard/home/WorkerUpcoming";
import { WorkerUnfinished } from "../../../components/dashboard/home/WorkerUnfinished";
import { workerHomeData, serviceName, addressText, hoursText, taskPath } from "../../../components/dashboard/home/workerHomeData";

export const WorkerHome = () => {
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [acting, setActing] = useState(false);
    const [now, setNow] = useState(() => new Date());
    const mounted = useRef(false);
    const fetching = useRef(false);
    const actionLock = useRef(false);
    const today = madridToday(now);

    const load = useCallback(async () => {
        if (fetching.current) return;
        fetching.current = true;
        try {
            const result = await getWorkerBookings(store.token);
            if (!mounted.current) return;
            if (result.status === 401) {
                dispatch({ type: "LOGOUT" });
                return;
            }
            if (!result.ok) setError(result.data?.message || "No se ha podido cargar tu jornada.");
            else {
                setBookings(result.data.bookings || []);
                setError("");
            }
        } catch {
            if (mounted.current) setError("No se ha podido cargar tu jornada. Inténtalo de nuevo.");
        } finally {
            fetching.current = false;
            if (mounted.current) setLoading(false);
        }
    }, [store.token, dispatch]);

    useEffect(() => {
        mounted.current = true;
        load();
        const refresh = () => {
            if (document.visibilityState !== "hidden") {
                setNow(new Date());
                load();
            }
        };
        // Volver del mapa o dejar abierto el móvil no debe congelar la jornada.
        const timer = window.setInterval(refresh, 60000);
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", refresh);
        return () => {
            mounted.current = false;
            window.clearInterval(timer);
            window.removeEventListener("focus", refresh);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [load]);

    const data = workerHomeData(bookings, today, madridMoment(now));
    const current = data.current;

    const openCurrent = async () => {
        if (!current || actionLock.current) return;
        const { booking, day } = current;
        if (day.started_at) {
            navigate(taskPath(booking));
            return;
        }
        actionLock.current = true;
        setActing(true);
        setError("");
        try {
            const result = await startBookingDay(booking.booking_id, day.booking_day_id, store.token);
            if (!mounted.current) return;
            if (result.status === 401) dispatch({ type: "LOGOUT" });
            else if (result.ok) navigate(taskPath(booking));
            else setError(result.data?.message || "No se ha podido empezar el servicio.");
        } catch {
            if (mounted.current) setError("No se ha podido empezar el servicio. Inténtalo de nuevo.");
        } finally {
            actionLock.current = false;
            if (mounted.current) setActing(false);
        }
    };

    if (loading) return (
        <div className="cf-worker-home" aria-busy="true" role="status">
            <p>Cargando tu jornada…</p>
            <div className="cf-dash-skel cf-worker-home__skeleton" aria-hidden="true" />
        </div>
    );

    // Sin una respuesta fiable no presentamos un falso día libre.
    if (error && bookings.length === 0) return (
        <div className="cf-worker-home cf-dash-state">
            <h1>Tu inicio</h1>
            <p role="alert">{error}</p>
            <button className="cf-dash-btn" onClick={load}>Reintentar</button>
        </div>
    );

    const name = store.user?.name?.trim().split(/\s+/)[0];
    const address = current && addressText(current.booking.address);
    const next = data.future[0];

    return (
        <div className="cf-worker-home">
            {error && <div className="cf-dash-alert" role="alert">
                <p>{error}</p><button className="cf-dash-btn cf-dash-btn--ghost" onClick={load}>Reintentar</button>
            </div>}
            <section className="cf-worker-home__hero" aria-labelledby="worker-home-title">
                <p className="cf-worker-home__date">{longDate(today)}</p>
                <h1 id="worker-home-title">Hola{name ? `, ${name}` : ""}.</h1>
                <p className="cf-worker-home__summary">
                    {data.services} {data.services === 1 ? "servicio" : "servicios"} · {hoursText(data.hours)} previstas hoy
                </p>
                {current ? <div className="cf-worker-home__now">
                    <p className="cf-worker-home__date">{current.day.started_at ? "En curso" : "Tu siguiente servicio"}</p>
                    <p className="cf-worker-home__time">{timeOf(current.day.starts_at)} – {timeOf(current.day.ends_at)}</p>
                    <h2>{serviceName(current.booking)}</h2>
                    <p>{current.booking.tasks?.length || 0} {current.booking.tasks?.length === 1 ? "tarea" : "tareas"} del servicio</p>
                    {current.booking.address ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">{address} ↗</a> : <p>{address}</p>}
                    <p>{current.booking.client_name || "Cliente"}
                        {current.booking.client_phone && <> · <a href={`tel:${current.booking.client_phone}`}>{current.booking.client_phone}</a></>}
                    </p>
                    {current.booking.status === "pending" && <p>El servicio está pendiente de confirmación.</p>}
                    <button className="cf-dash-btn cf-worker-home__action" disabled={acting || current.booking.status === "pending"} onClick={openCurrent}>
                        {acting ? "Empezando…" : current.day.started_at ? "Seguir" : "Empezar el servicio"}
                    </button>
                </div> : <div className="cf-worker-home__now">
                    <h2>{data.journey.length ? "Has terminado tu jornada" : "Sin servicios hoy"}</h2>
                    {next ? <p>El siguiente: {longDate(next.day.starts_at).toLowerCase()}, {timeOf(next.day.starts_at)} – {timeOf(next.day.ends_at)} · {serviceName(next.booking)}.</p>
                        : <p>No tienes próximos servicios asignados.</p>}
                </div>}
                <WorkerJourney journey={data.journey} current={current} />
            </section>
            <WorkerUnfinished items={data.unfinished} />
            <div className="cf-worker-home__grid">
                <WorkerUpcoming today={today} future={data.future} />
                <aside className="cf-worker-home__aside" aria-label="Tu información">
                    <section className="cf-worker-home__card">
                        <WorkerRating token={store.token} />
                    </section>
                    <WorkerAbsences today={today} />
                </aside>
            </div>
        </div>
    );
};
