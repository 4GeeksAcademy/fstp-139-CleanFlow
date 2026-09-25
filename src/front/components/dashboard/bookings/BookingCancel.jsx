import { useEffect, useRef, useState } from "react";
import useGlobalReducer from "../../../hooks/useGlobalReducer";
import { cancelBooking } from "../../../services/bookingService";
import { refreshAffected } from "../../../services/absenceService";

export const BookingCancel = ({ booking, onCancelled }) => {
    const { store, dispatch } = useGlobalReducer();
    const dialogRef = useRef(null);
    const sendingRef = useRef(false);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [now, setNow] = useState(Date.now);
    const deadline = Date.parse(booking.change_deadline);
    const eligible = ["pending", "confirmed"].includes(booking.status)
        && !booking.started_at;
    const canCancel = eligible && Number.isFinite(deadline) && now <= deadline;

    useEffect(() => {
        if (!eligible) return;

        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [eligible]);

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

            if (result.status === 401) {
                dialogRef.current?.close();
                dispatch({ type: "LOGOUT" });
                return;
            }

            if (!result.ok) {
                setError(result.data?.message || "No se ha podido cancelar la reserva.");
                setNow(Date.now());
                return;
            }

            dialogRef.current?.close();
            onCancelled(result.data.booking);
            refreshAffected();
        } catch {
            setError("No se ha podido conectar. Inténtalo de nuevo.");
        } finally {
            sendingRef.current = false;
            setBusy(false);
        }
    };

    if (store.user?.role !== "client" || !eligible) return null;

    return (
        <section className="cf-bookblock" aria-label="Cancelación de la reserva">
            {canCancel ? (
                <button
                    type="button"
                    className="cf-dash-btn cf-dash-btn--danger"
                    onClick={openDialog}
                >
                    Cancelar reserva
                </button>
            ) : (
                <p className="cf-dash-alert" role="status">
                    Para cancelar, contacta con CleanFlow
                </p>
            )}

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
                        ¿Cancelar la reserva #{booking.booking_id}?
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
                            maxLength={1000}
                            rows={3}
                            disabled={busy}
                        ></textarea>
                    </div>

                    {error && (
                        <p className="cf-dash-alert" role="alert">{error}</p>
                    )}
                    {!canCancel && !error && (
                        <p className="cf-dash-alert" role="status">
                            Para cancelar, contacta con CleanFlow
                        </p>
                    )}

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
                            disabled={busy || !canCancel}
                        >
                            {busy ? "Cancelando…" : "Confirmar cancelación"}
                        </button>
                    </div>
                </form>
            </dialog>
        </section>
    );
};
