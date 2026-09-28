import { useCallback, useEffect, useState } from "react";

import useGlobalReducer from "../../../hooks/useGlobalReducer";
import { getMyBookings } from "../../../services/bookingService";
import { NextBooking } from "../../../components/dashboard/home/NextBooking";
import { ClientPendingActions } from "../../../components/dashboard/home/ClientPendingActions";
import { RebookServices } from "../../../components/dashboard/home/RebookServices";
import { EmptyClientHome } from "../../../components/dashboard/home/EmptyClientHome";
const nextConfirmedBooking = (bookings) => {
    const now = new Date();

    return bookings
        .filter((booking) =>
            ["confirmed", "in_progress"].includes(booking.status)
        )
        .flatMap((booking) =>
            (booking.days || [])
                .filter(
                    (day) =>
                        !day.finished_at &&
                        new Date(day.ends_at) >= now
                )
                .map((day) => ({ booking, day }))
        )
        .sort((first, second) =>
            first.day.starts_at.localeCompare(second.day.starts_at)
        )[0] || null;
};

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

    if (bookings.length === 0) {
        return (
            <EmptyClientHome
                firstName={firstName}
                services={store.services}
            />
        );
    }

    return (
        <div className="cf-client-home">
            <header className="cf-client-home__header">
                <p className="cf-dash-eyebrow">Inicio</p>

                <h1>Hola, {firstName}</h1>

                <p>
                    Aquí tienes lo próximo y todo lo que espera tu respuesta.
                </p>
            </header>

            <NextBooking
                booking={nextBooking?.booking}
                day={nextBooking?.day}
            />

            <ClientPendingActions bookings={bookings} />
            <RebookServices
                bookings={bookings}
                services={store.services}
            />
        </div>
    );
};