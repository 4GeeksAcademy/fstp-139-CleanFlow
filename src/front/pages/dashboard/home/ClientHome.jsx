import { useCallback, useEffect, useState } from "react";

import useGlobalReducer from "../../../hooks/useGlobalReducer";
import { getMyBookings } from "../../../services/bookingService";
import { NextBooking } from "../../../components/dashboard/home/NextBooking";
import { ClientPendingActions } from "../../../components/dashboard/home/ClientPendingActions";

const nextConfirmedBooking = (bookings) =>
    bookings
        .filter(
            (booking) =>
                booking.status === "confirmed" &&
                booking.days?.length > 0
        )
        .sort((first, second) =>
            first.days[0].starts_at.localeCompare(
                second.days[0].starts_at
            )
        )[0] || null;

export const ClientHome = () => {
    const { store, dispatch } = useGlobalReducer();

    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadBookings = useCallback(async () => {
        setLoading(true);
        setError("");

        const result = await getMyBookings(store.token);

        if (result.status === 401) {
            dispatch({ type: "LOGOUT" });
            return;
        }

        if (result.ok) {
            setBookings(result.data.bookings || []);
        } else {
            setError(
                result.data?.message ||
                "No hemos podido cargar tu inicio."
            );
        }

        setLoading(false);
    }, [store.token, dispatch]);

    useEffect(() => {
        loadBookings();
    }, [loadBookings]);

    if (loading) {
        return (
            <div className="cf-client-home" aria-busy="true">
                <div className="cf-dash-skel cf-client-home__skel-title"></div>
                <div className="cf-dash-skel cf-client-home__skel-card"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="cf-client-home">
                <div className="cf-dash-state" role="alert">
                    <p className="cf-dash-state__title">
                        No hemos podido cargar tu inicio
                    </p>

                    <p className="cf-dash-state__text">
                        {error}
                    </p>

                    <button
                        type="button"
                        className="cf-dash-btn"
                        onClick={loadBookings}
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    const nextBooking = nextConfirmedBooking(bookings);
    const firstName = store.user?.name || "Hola";

    return (
        <div className="cf-client-home">
            <header className="cf-client-home__header">
                <p className="cf-dash-eyebrow">Inicio</p>

                <h1>Hola, {firstName}</h1>

                <p>
                    Aquí tienes lo próximo y todo lo que espera tu respuesta.
                </p>
            </header>

            <NextBooking booking={nextBooking} />

            <ClientPendingActions bookings={bookings} />
        </div>
    );
};