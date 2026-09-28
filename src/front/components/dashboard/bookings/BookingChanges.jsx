/**
 * LAS DOS SALIDAS DE UNA RESERVA (#17).
 *
 * Cambiarle la fecha o cancelarla. Van juntas porque son la misma
 * decisión vista de dos maneras, y las dos caducan a la vez.
 *
 * No es una tarjeta más: es una franja al pie de la página, debajo de
 * las dos columnas. Primero se lee el detalle entero y después se
 * decide, que es el orden en el que se mira una reserva.
 *
 * Los dos pesos son distintos a propósito. Cambiar la fecha es lo
 * reversible y va como botón; cancelar vive dentro de la frase, junto al
 * plazo, que es donde tiene sentido leerlo.
 *
 * El cliente puede hasta 24 h antes del primer día. Pasado el plazo se
 * le dice a quién acudir: el encargado sí puede, pero desde aquí no.
 *
 * El plazo lo calcula el backend (Booking.change_deadline) y aquí solo
 * se compara con la hora actual, que se refresca cada segundo para que
 * la franja se cierre sola al cruzarlo.
 *
 * Estilos: dashboard.css, sección 14 (cf-bookend y cf-resched).
 */

import { useEffect, useRef, useState } from "react";
import useGlobalReducer from "../../../hooks/useGlobalReducer";
import { cancelBooking, rescheduleBooking } from "../../../services/bookingService";
import { refreshAffected } from "../../../services/absenceService";
import { RescheduleForm } from "./RescheduleForm";
import { dayAndTime } from "./bookingFormat";

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
        <>
            <section
                className={`cf-bookend${inTime ? "" : " cf-bookend--closed"}`}
                aria-label="Cambios en la reserva"
            >
                {inTime ? (
                    <>
                        <div>
                            <p className="cf-bookend__ask">
                                ¿Necesitas cambiar el día de la reserva?
                            </p>
                            <p className="cf-bookend__when">
                                Puedes cambiarla, o{" "}
                                <button
                                    type="button"
                                    className="cf-bookend__link"
                                    onClick={openDialog}
                                >
                                    cancelarla aquí
                                </button>
                                , antes del {dayAndTime(booking.change_deadline)}.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="cf-dash-btn"
                            onClick={() => { setMovingError(""); setMoving(true); }}
                        >
                            <i className="fa-regular fa-calendar" aria-hidden="true"></i>
                            Cambiar la fecha
                        </button>
                    </>
                ) : (
                    /* Un solo aviso para las dos: decir lo mismo dos veces
                       no ayuda a nadie. */
                    <p className="cf-bookend__ask" role="status">
                        <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
                        {" "}Ya no se puede cambiar la fecha ni cancelar por aquí.
                        {" "}Escríbenos y lo vemos.
                    </p>
                )}
            </section>

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
        </>
    );
};
