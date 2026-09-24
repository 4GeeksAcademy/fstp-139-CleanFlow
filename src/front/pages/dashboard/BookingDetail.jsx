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

const LIST_PATH = "/dashboard/contracted-services";

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles",
                  "jueves", "viernes", "sábado"];

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
                "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/**
 * "2026-09-23T08:00:00" -> "Martes 23 de septiembre".
 *
 * Las fechas llegan en hora de Madrid y sin zona. El Date se construye
 * con los números sueltos para que el navegador no las mueva a su huso.
 */
const longDate = (isoDate) => {
    const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
    const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()];

    return `${weekday[0].toUpperCase()}${weekday.slice(1)} ${day} de ${MONTHS[month - 1]}`;
};

const timeOf = (isoDate) => isoDate.slice(11, 16);

export const BookingDetail = () => {
    const { bookingId } = useParams();
    const { store, dispatch } = useGlobalReducer();

    const [booking, setBooking] = useState(null);
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

        </div>
    );
};