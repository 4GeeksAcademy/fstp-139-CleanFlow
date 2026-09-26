/**
 * SI ALGO CAMBIA (#17).
 *
 * Las dos salidas de una reserva que aún no ha empezado: cambiarle la
 * fecha o cancelarla. Van juntas en un bloque porque son la misma
 * decisión vista de dos maneras, y las dos caducan a la vez.
 *
 * El cliente puede hasta 24 h antes del primer día. Pasado el plazo se
 * le dice a quién acudir en lugar de los botones: el encargado sí puede,
 * pero desde aquí no.
 *
 * El plazo lo calcula el backend (Booking.change_deadline) y aquí solo
 * se compara con la hora actual, que se refresca cada segundo para que
 * los botones desaparezcan solos al cruzarlo.
 *
 * Estilos: dashboard.css, sección 9 (cf-bookblock) y 14 (cf-resched).
 */

import { useEffect, useRef, useState } from "react";
import useGlobalReducer from "../../../hooks/useGlobalReducer";
import { cancelBooking, rescheduleBooking } from "../../../services/bookingService";
import { refreshAffected } from "../../../services/absenceService";
import { RescheduleForm } from "./RescheduleForm";

// Lo mismo que acepta el backend.
const REASON_MAX_LENGTH = 1000;

export const BookingChanges = ({ booking, onChanged }) => {
    const { store, dispatch } = useGlobalReducer();

    const dialogRef = useRef(null);
    const sendingRef = useRef(false);

    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [now, setNow] = useState(Date.now);

    // El diálogo de cambiar la fecha, con su propio estado: las dos
    // acciones no se pueden hacer a la vez, pero sus errores no tienen
    // por qué pisarse.
    const [moving, setMoving] = useState(false);
    const [movingBusy, setMovingBusy] = useState(false);
    const [movingError, setMovingError] = useState("");

    const deadline = Date.parse(booking.change_deadline);
    const eligible = ["pending", "confirmed"].includes(booking.status)
        && !booking.started_at;
    const inTime = eligible && Number.isFinite(deadline) && now <= deadline;

    // El reloj solo corre cuando puede pasar algo: en una reserva
    // finalizada repintar cada segundo no sirve de nada.
    useEffect(() => {
        if (!eligible) return;

        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [eligible]);

    /** Cierra sesión si el token caducó. true si no hay que seguir. */
    const expired = (result) => {
        if (result.status !== 401) return false;

        dispatch({ type: "LOGOUT" });
        return true;
    };

    // ---------- CANCELAR ----------

    const closeDialog = () => {
        if (!sendingRef.current) dialogRef.current?.close();
    };

    const openDialog = () => {
        setNow(Date.now());
        setError("");
        setReason("");
        dialogRef.current?.showModal();
    };

    const confirmCancel = async (event) => {
        event.preventDefault();

        if (sendingRef.current) return;

        // El plazo se vuelve a mirar al enviar: el diálogo pudo quedarse
        // abierto mientras se cumplía.
        if (!Number.isFinite(deadline) || Date.now() > deadline) {
            setNow(Date.now());
            setError("Para cancelar, contacta con CleanFlow");
            return;
        }

        sendingRef.current = true;
        setBusy(true);
        setError("");

        try {
            const result = await cancelBooking(
                booking.booking_id, store.token, reason.trim()
            );

            if (expired(result)) {
                dialogRef.current?.close();
                return;
            }

            if (!result.ok) {
                setError(result.data?.message || "No se ha podido cancelar la reserva.");
                setNow(Date.now());
                return;
            }

            dialogRef.current?.close();
            onChanged(result.data.booking);

            // El contador de reservas afectadas del menú baja al momento.
            refreshAffected();
        } catch {
            setError("No se ha podido conectar. Inténtalo de nuevo.");
        } finally {
            sendingRef.current = false;
            setBusy(false);
        }
    };

    // ---------- CAMBIAR LA FECHA ----------

    const confirmMove = async (data) => {
        setMovingBusy(true);
        setMovingError("");

        const result = await rescheduleBooking(booking.booking_id, data, store.token);

        setMovingBusy(false);

        if (expired(result)) return;

        if (!result.ok) {
            // Se deja abierto: con un error, lo elegido sigue ahí y se
            // puede probar otra hora sin empezar de cero.
            setMovingError(result.data.message);
            return;
        }

        setMoving(false);
        onChanged(result.data.booking);
        refreshAffected();
    };

    // ---------- LO QUE SE PINTA ----------

    // El encargado también puede, pero no desde esta pantalla: esto es el
    // detalle del cliente.
    if (store.user?.role !== "client" || !eligible) return null;

    return (
        <section className="cf-bookblock" aria-label="Cambios en la reserva">
            <p className="cf-bookblock__title">Si algo cambia</p>

            {inTime ? (
                <div className="cf-changes__row">
                    <button
                        type="button"
                        className="cf-dash-btn cf-dash-btn--ghost"
                        onClick={() => { setMovingError(""); setMoving(true); }}
                    >
                        <i className="fa-regular fa-calendar" aria-hidden="true"></i>
                        Cambiar la fecha
                    </button>

                    <button
                        type="button"
                        className="cf-dash-btn cf-dash-btn--danger"
                        onClick={openDialog}
                    >
                        Cancelar reserva
                    </button>
                </div>
            ) : (
                /* Un solo aviso para las dos: decir lo mismo dos veces
                   no ayuda a nadie. */
                <p className="cf-dash-alert" role="status">
                    Para cambiar la fecha o cancelar, contacta con CleanFlow
                </p>
            )}

            <RescheduleForm
                booking={booking}
                open={moving}
                saving={movingBusy}
                error={movingError}
                token={store.token}
                onSubmit={confirmMove}
                onClose={() => setMoving(false)}
            />

            <dialog
                ref={dialogRef}
                className="cf-dash-modal"
                aria-labelledby="cancel-booking-title"
                aria-describedby="cancel-booking-description"
                onCancel={(event) => {
                    if (sendingRef.current) event.preventDefault();
                }}
                onClick={(event) => {
                    if (event.target === event.currentTarget) closeDialog();
                }}
            >
                <form className="cf-dash-modal__body" onSubmit={confirmCancel}>
                    <span className="cf-dash-modal__icon">
                        <i className="fa-solid fa-ban" aria-hidden="true" />
                    </span>

                    <h2 className="cf-dash-modal__title" id="cancel-booking-title">
                        ¿Cancelar la reserva n.º {booking.booking_id}?
                    </h2>

                    <p className="cf-dash-modal__text" id="cancel-booking-description">
                        Se liberará el horario reservado. Esta acción no se puede deshacer.
                    </p>

                    <div className="cf-inc-field">
                        <label className="cf-inc-field__label" htmlFor="cancel-booking-reason">
                            Motivo (opcional)
                        </label>
                        <textarea
                            id="cancel-booking-reason"
                            className="cf-dash-input"
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            maxLength={REASON_MAX_LENGTH}
                            rows={3}
                            disabled={busy}
                        ></textarea>
                    </div>

                    {error && <p className="cf-dash-alert" role="alert">{error}</p>}

                    <div className="cf-dash-modal__actions">
                        <button
                            type="button"
                            className="cf-dash-btn cf-dash-btn--ghost"
                            onClick={closeDialog}
                            disabled={busy}
                            autoFocus
                        >
                            Volver
                        </button>

                        <button
                            type="submit"
                            className="cf-dash-btn cf-dash-btn--danger"
                            disabled={busy || !inTime}
                        >
                            {busy ? "Cancelando…" : "Confirmar cancelación"}
                        </button>
                    </div>
                </form>
            </dialog>
        </section>
    );
};
