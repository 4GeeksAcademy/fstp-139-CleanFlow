/**
 * DETALLE DE UN SERVICIO CONTRATADO.
 *
 * Lo que se abre al pulsar una tarjeta de Mis servicios: en qué punto
 * está, qué se contrató, cuánto costó, quién lo hizo, cómo quedó y si
 * hubo alguna incidencia.
 *
 * Desde aquí también responde: da el servicio por bueno o cuenta que
 * algo no fue bien (#83), cambiar la fecha o cancelar mientras esté en
 * plazo (#17) y valorar cuando lo dio por bueno (#20).
 *
 * Estilos: dashboard.css, sección 9 (cf-bookdetail).
 */

import "../../dashboard.css";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { getMyBookings, confirmBooking, claimBooking } from "../../services/bookingService";
import { createReview } from "../../services/reviewService";
import { BookingStatusPill, awaitsConfirmation } from "../../components/dashboard/bookings/BookingStatusPill";
import { BookingTimeline } from "../../components/dashboard/bookings/BookingTimeline";
import { BookingCancelled } from "../../components/dashboard/bookings/BookingCancelled";
import { BookingChanges } from "../../components/dashboard/bookings/BookingChanges";
import { BookingWhat } from "../../components/dashboard/bookings/BookingWhat";
import { BookingPrice } from "../../components/dashboard/bookings/BookingPrice";
import { BookingWorker } from "../../components/dashboard/bookings/BookingWorker";
import { BookingWhen } from "../../components/dashboard/bookings/BookingWhen";
import { BookingPhotos } from "../../components/dashboard/bookings/BookingPhotos";
import { BookingConfirm } from "../../components/dashboard/bookings/BookingConfirm";
import { BookingReview } from "../../components/dashboard/bookings/BookingReview";
import { ClaimForm } from "../../components/dashboard/bookings/ClaimForm";
import { BookingIncidents } from "../../components/dashboard/bookings/BookingIncidents";
import { BookingZoom } from "../../components/dashboard/bookings/BookingZoom";
import { longDate, timeOf } from "../../components/dashboard/bookings/bookingFormat";

const LIST_PATH = "/dashboard/contracted-services";

export const BookingDetail = () => {
    const { bookingId } = useParams();
    const { store, dispatch } = useGlobalReducer();

    const [booking, setBooking] = useState(null);
    const [zoomed, setZoomed] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        // active: si el usuario se va antes de que llegue la respuesta,
        // ya no se escribe en el estado de un componente desmontado.
        let active = true;

        const load = async () => {
            const result = await getMyBookings(store.token);

            if (!active) return;

            // Sesión caducada: se apaga la carga antes de salir, o la
            // pantalla se queda con las barras grises si la redirección
            // de ProtectedRoutes tarda un instante.
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

            // El backend solo devuelve las reservas del cliente del token,
            // así que buscar aquí ya es buscar entre las suyas.
            const found = result.data.bookings.find(
                (row) => String(row.booking_id) === bookingId
            );

            setBooking(found || null);
            setLoading(false);
        };

        load();

        return () => { active = false; };
    }, [bookingId, store.token, dispatch]);


    // ---------- LA RESPUESTA AL SERVICIO (#83) ----------

    // Si el formulario de reclamación está abierto, y si hay una llamada
    // en marcha: las dos acciones comparten el "ocupado" porque no se
    // pueden hacer a la vez.
    const [claiming, setClaiming] = useState(false);
    const [answering, setAnswering] = useState(false);

    /** Cierra sesión si el token caducó. true si no hay que seguir. */
    const expired = (result) => {
        if (result.status !== 401) return false;

        dispatch({ type: "LOGOUT" });
        return true;
    };

    const handleConfirm = async () => {
        setAnswering(true);
        setError("");

        const result = await confirmBooking(booking.booking_id, store.token);

        setAnswering(false);

        if (expired(result)) return;

        // Devuelve la reserva con su confirmation ya recalculada: se pinta
        // la que llega y el bloque cambia solo.
        if (result.ok) setBooking(result.data.booking);
        else setError(result.data.message);
    };


    /**
     * El cliente dice que algo no fue bien.
     *
     * Crea la incidencia que resolverá el encargado (#19) y devuelve la
     * reserva con confirmation en "in_review": el bloque cambia solo.
     */
    const handleClaim = async (data) => {
        setAnswering(true);
        setError("");

        const result = await claimBooking(booking.booking_id, data, store.token);

        setAnswering(false);

        if (expired(result)) return;

        if (!result.ok) {
            setError(result.data.message);
            return;
        }

        // Se cierra solo si salió bien: con un error, lo escrito y las
        // fotos siguen ahí y se puede reintentar sin empezar de cero.
        setBooking(result.data.booking);
        setClaiming(false);
    };


    // ---------- LA VALORACIÓN (#20) ----------

    // Aparte de answering: valorar no es responder, y el error de una no
    // tiene por qué borrar el mensaje de la otra.
    const [rating, setRating] = useState(false);
    const [rateError, setRateError] = useState("");

    /**
     * El cliente pone su nota.
     *
     * Devuelve la reserva con la reseña ya dentro, así que el bloque pasa
     * solo del formulario a lo que dejó escrito.
     */
    const handleRate = async (data) => {
        setRating(true);
        setRateError("");

        const result = await createReview(booking.booking_id, data, store.token);

        setRating(false);

        if (expired(result)) return;

        if (!result.ok) {
            setRateError(result.data.message);
            return;
        }

        setBooking(result.data.booking);
    };

    // ---------- MIENTRAS LLEGA LA RESERVA ----------

    if (loading) {
        return (
            <div className="cf-bookdetail" aria-busy="true">
                <div className="cf-dash-skel" style={{ width: "120px", height: "14px" }}></div>
                <div className="cf-bookdetail__header">
                    <div style={{ flex: 1 }}>
                        <div className="cf-dash-skel" style={{ width: "38%", height: "28px" }}></div>
                        <div className="cf-dash-skel" style={{ width: "56%", height: "14px", marginTop: "12px" }}></div>
                    </div>
                </div>
            </div>
        );
    }

    // ---------- LO QUE PUEDE SALIR MAL ----------

    // Un fallo de red o del servidor: se cuenta y se deja la vuelta.
    if (error) {
        return (
            <div className="cf-bookdetail">
                <Link to={LIST_PATH} className="cf-bookdetail__back">
                    <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
                    Mis servicios
                </Link>
                <p className="cf-dash-alert" role="alert">{error}</p>
            </div>
        );
    }

    // Reserva que no existe, o que es de otro cliente. El mensaje es el
    // mismo a propósito: decir "no es tuya" ya confirmaría que existe.
    if (!booking) {
        return (
            <div className="cf-bookdetail">
                <div className="cf-dash-state">
                    <span className="cf-dash-state__icon">
                        <i className="fa-regular fa-calendar-xmark" aria-hidden="true"></i>
                    </span>
                    <p className="cf-dash-state__title">Este servicio no existe</p>
                    <p className="cf-dash-state__text">
                        Puede que se haya borrado o que el enlace no sea correcto.
                    </p>
                    <Link to={LIST_PATH} className="cf-dash-btn">Volver a mis servicios</Link>
                </div>
            </div>
        );
    }

    // ---------- LA RESERVA ----------

    const [first] = booking.days;

    return (
        <div className="cf-bookdetail">

            <Link to={LIST_PATH} className="cf-bookdetail__back">
                <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
                Mis servicios
            </Link>

            <div className="cf-bookdetail__header">
                <div>
                    {/* La sección de la que viene, como en el resto del panel. */}
                    <p className="cf-dash-eyebrow">Mis servicios</p>
                    <h1 className="cf-bookdetail__title">
                        {booking.service?.name || "Servicio no disponible"}
                    </h1>
                    <p className="cf-bookdetail__sub">
                        {longDate(first.starts_at)} · {timeOf(first.starts_at)} – {timeOf(first.ends_at)}
                        {" · "}Reserva n.º {booking.booking_id}
                    </p>
                </div>

                {/* Aquí no hay sitio para un aviso aparte, así que es la
                    propia pastilla la que pide la confirmación. */}
                <BookingStatusPill
                    status={booking.status}
                    awaitingConfirmation={awaitsConfirmation(booking)}
                />
            </div>

            {/* La columna ancha se lee en orden; la estrecha se consulta. */}
            <div className="cf-bookdetail__grid">

                <div className="cf-bookdetail__col">
                    <BookingTimeline booking={booking} />
                    <BookingCancelled booking={booking} />
                    <BookingChanges key={booking.booking_id} booking={booking} onChanged={setBooking} />
                    <BookingWhat booking={booking} />
                    <BookingPhotos tasks={booking.tasks} onZoom={setZoomed} />
                    <BookingConfirm
                        booking={booking}
                        saving={answering}
                        onConfirm={handleConfirm}
                        onClaim={() => setClaiming(true)}
                    />
                    <BookingReview
                        booking={booking}
                        saving={rating}
                        error={rateError}
                        onSubmit={handleRate}
                    />
                </div>

                <div className="cf-bookdetail__col">
                    <BookingPrice booking={booking} />
                    <BookingWorker booking={booking} />
                    <BookingWhen booking={booking} />
                    <BookingIncidents incidents={booking.incidents} onZoom={setZoomed} />
                </div>

            </div>

            <BookingZoom photo={zoomed} onClose={() => setZoomed(null)} />

            <ClaimForm
                open={claiming}
                saving={answering}
                onSubmit={handleClaim}
                onClose={() => setClaiming(false)}
            />

        </div>
    );
};