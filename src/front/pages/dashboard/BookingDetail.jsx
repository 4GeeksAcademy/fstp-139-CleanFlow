/**
 * DETALLE DE UN SERVICIO CONTRATADO.
 *
 * Lo que se abre al pulsar una tarjeta de Mis servicios: en qué punto
 * está, qué se contrató, cuánto costó, quién lo hizo, cómo quedó y si
 * hubo alguna incidencia.
 *
 * Es la pantalla donde aterrizarán cancelar (#17), confirmar o reclamar
 * (#83) y valorar (#20). Aquí solo se lee.
 *
 * Estilos: dashboard.css, sección 9 (cf-bookdetail).
 */

import "../../dashboard.css";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { getMyBookings } from "../../services/bookingService";
import { BookingStatusPill } from "../../components/dashboard/bookings/BookingStatusPill";
import { BookingTimeline } from "../../components/dashboard/bookings/BookingTimeline";
import { BookingWhat } from "../../components/dashboard/bookings/BookingWhat";
import { BookingPrice } from "../../components/dashboard/bookings/BookingPrice";
import { BookingWorker } from "../../components/dashboard/bookings/BookingWorker";
import { BookingWhen } from "../../components/dashboard/bookings/BookingWhen";
import { BookingPhotos } from "../../components/dashboard/bookings/BookingPhotos";
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

            if (result.status === 401) {
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

                <BookingStatusPill status={booking.status} />
            </div>

            {/* La columna ancha se lee en orden; la estrecha se consulta. */}
            <div className="cf-bookdetail__grid">

                <div className="cf-bookdetail__col">
                    <BookingTimeline booking={booking} />
                    <BookingWhat booking={booking} />
                    <BookingPhotos tasks={booking.tasks} onZoom={setZoomed} />
                </div>

                <div className="cf-bookdetail__col">
                    <BookingPrice booking={booking} />
                    <BookingWorker booking={booking} />
                    <BookingWhen booking={booking} />
                    <BookingIncidents incidents={booking.incidents} onZoom={setZoomed} />
                </div>

            </div>

            <BookingZoom photo={zoomed} onClose={() => setZoomed(null)} />

        </div>
    );
};