/**
 * CAMBIAR LA FECHA DE UNA RESERVA (#17).
 *
 * El diálogo donde el cliente elige otro día y otra hora. Se abre con su
 * trabajador ya puesto: cambiar la fecha no debería significar cambiar de
 * persona. Si esa persona no tiene hueco, hay una salida visible a todo
 * el equipo, y antes de confirmar se dice si el servicio cambiaría de
 * manos.
 *
 * Reutiliza el calendario del panel de contratación (#14): los turnos, el
 * margen entre servicios y el reparto ya están resueltos allí.
 *
 * Pide los huecos él mismo, porque cambian con cada mes que se pasa. La
 * llamada que mueve la reserva la hace la página, con onSubmit.
 *
 * Estilos: dashboard.css, sección 14 (cf-resched).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getAvailability } from "../../../services/availabilityService";
import { BookingCalendar } from "../booking/BookingCalendar";
import { longDate, timeOf } from "./bookingFormat";

// Los mismos que el panel: la ventana de reserva es de 60 días.
const HORIZON_DAYS = 60;

const ANY = "any";

/** Una fecha a "2026-10". */
const monthOf = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

/** Suma meses a un "2026-10". */
const shiftMonth = (month, step) => {
    const [year, number] = month.split("-").map(Number);

    return monthOf(new Date(year, number - 1 + step, 1));
};

export const RescheduleForm = ({ booking, open, saving, error, onSubmit, onClose, token }) => {
    const dialog = useRef(null);

    const [month, setMonth] = useState(monthOf(new Date()));
    const [slots, setSlots] = useState({});
    const [day, setDay] = useState("");
    const [start, setStart] = useState("");

    // "con quién se busca": el trabajador actual o todo el equipo.
    const [scope, setScope] = useState("mine");

    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState("");

    const workerId = booking?.worker?.worker_id ?? null;
    const workerName = booking?.worker_name || "quien vino";
    const hours = booking?.hours ?? 0;

    // Abrir y cerrar lo decide la prop: el dialog solo obedece.
    useEffect(() => {
        if (!dialog.current) return;

        if (open && !dialog.current.open) dialog.current.showModal();
        if (!open && dialog.current.open) dialog.current.close();
    }, [open]);

    // Al cerrarse se vacía: la próxima vez no debe heredar la elección
    // que se quedó a medias.
    useEffect(() => {
        if (open) return;

        setMonth(monthOf(new Date()));
        setDay("");
        setStart("");
        setScope("mine");
        setLoadError("");
    }, [open]);

    const load = useCallback(async () => {
        if (!open || !booking) return;

        setLoading(true);
        setLoadError("");

        const result = await getAvailability(
            {
                hours,
                month,
                // Sin trabajador propio no hay a quién conservar: se busca
                // con todo el equipo desde el principio.
                worker: scope === "mine" && workerId ? String(workerId) : ANY,
                // Los tramos de esta reserva cuentan como libres, o no
                // podría moverse ni dos horas dentro de su mismo día.
                excludeBooking: booking.booking_id,
            },
            token,
        );

        setLoading(false);

        if (result.ok) setSlots(result.data);
        else setLoadError(result.data.message);
    }, [open, booking, hours, month, scope, workerId, token]);

    useEffect(() => { load(); }, [load]);

    // Al cambiar de mes o de ámbito, lo elegido deja de valer.
    useEffect(() => {
        setDay("");
        setStart("");
    }, [month, scope]);

    if (!booking) return null;

    const today = new Date();
    const firstMonth = monthOf(today);
    const lastMonth = monthOf(new Date(
        today.getFullYear(), today.getMonth(), today.getDate() + HORIZON_DAYS,
    ));

    // Los tramos que ocuparía la hora elegida: con varios días, el resto
    // se marcan en el calendario.
    const chosenSlot = slots[day]?.find((slot) => slot.start === start);
    const bookedDays = chosenSlot ? chosenSlot.options[0].days : [];

    // Quién iría. Con el trabajador propio la respuesta es él; buscando
    // con todo el equipo, el backend reparte, así que solo se puede
    // asegurar cuando queda una única opción.
    const free = chosenSlot ? chosenSlot.options.map((option) => option.worker_id) : [];
    const keepsWorker = workerId !== null && free.includes(workerId);

    const ready = Boolean(day && start) && !saving;

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!ready) return;

        onSubmit({
            startsAt: `${day}T${start}`,
            // Solo se fija a alguien si es el de siempre y sigue libre. En
            // los demás casos decide el backend, con quien menos carga
            // tenga ese día.
            workerId: keepsWorker ? workerId : null,
        });
    };

    const [first] = booking.days;

    return (
        <dialog
            className="cf-resched"
            ref={dialog}
            aria-label="Cambiar la fecha de la reserva"
            onClose={onClose}
        >
            <form className="cf-resched__form" onSubmit={handleSubmit}>

                <div className="cf-resched__head">
                    <div>
                        <h2 className="cf-resched__title">Cambiar la fecha</h2>
                        <p className="cf-resched__sub">
                            Reserva n.º {booking.booking_id}
                            {booking.service?.name && ` · ${booking.service.name}`}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="cf-resched__close"
                        aria-label="Cerrar"
                        onClick={onClose}
                    >
                        <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                </div>

                <div className="cf-resched__body">

                    {/* Qué tiene ahora: sin esto habría que cerrar el
                        diálogo para recordarlo. */}
                    {first && (
                        <p className="cf-resched__now">
                            <i className="fa-regular fa-clock" aria-hidden="true"></i>
                            <span>
                                Ahora: <strong>
                                    {longDate(first.starts_at)}, {timeOf(first.starts_at)}
                                    –{timeOf(first.ends_at)}
                                </strong>
                            </span>
                        </p>
                    )}

                    {/* Con quién se buscan los huecos. */}
                    {workerId !== null && (
                        <div className="cf-resched__who" role="group" aria-label="Con quién">
                            <button
                                type="button"
                                className="cf-resched__chip"
                                aria-pressed={scope === "mine"}
                                onClick={() => setScope("mine")}
                            >
                                {workerName}
                            </button>
                            <button
                                type="button"
                                className="cf-resched__chip"
                                aria-pressed={scope === ANY}
                                onClick={() => setScope(ANY)}
                            >
                                Todo el equipo
                            </button>
                        </div>
                    )}

                    <BookingCalendar
                        days={slots}
                        month={month}
                        chosen={day}
                        spill={bookedDays.slice(1)}
                        loading={loading}
                        canGoBack={month > firstMonth}
                        canGoForward={month < lastMonth}
                        onMonthChange={(offset) => setMonth(shiftMonth(month, offset))}
                        onChoose={(key) => { setDay(key); setStart(""); }}
                    />

                    {loadError && <p className="cf-dash-alert" role="alert">{loadError}</p>}

                    {/* Sin huecos con su trabajador, la salida ocupa su
                        sitio: es lo único que puede hacer ahí. */}
                    {!loading && !loadError && Object.keys(slots).length === 0 && (
                        <div className="cf-resched__none">
                            {scope === "mine" && workerId !== null ? (
                                <>
                                    <p><strong>{workerName} no tiene ningún hueco este mes.</strong></p>
                                    <button
                                        type="button"
                                        className="cf-resched__switch"
                                        onClick={() => setScope(ANY)}
                                    >
                                        Ver disponibilidad con todo el equipo
                                    </button>
                                </>
                            ) : (
                                <p>No queda ningún hueco este mes. Prueba con el siguiente.</p>
                            )}
                        </div>
                    )}

                    {day && slots[day] && (
                        <div className="cf-resched__slots">
                            <p className="cf-resched__slots-title">
                                Horas libres el {longDate(`${day}T00:00`).toLowerCase()}
                            </p>

                            {slots[day].map((slot) => (
                                <button
                                    key={slot.start}
                                    type="button"
                                    className={`cf-booking__slot${slot.start === start ? " cf-booking__slot--chosen" : ""}`}
                                    onClick={() => setStart(slot.start)}
                                >
                                    {slot.start}
                                </button>
                            ))}
                        </div>
                    )}

                    {bookedDays.length > 1 && (
                        <p className="cf-resched__spill">
                            <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
                            Son {hours} horas, así que ocupará {bookedDays.length} días
                            con la misma persona.
                        </p>
                    )}

                    {/* Nunca se le cambia el trabajador en silencio. */}
                    {start && workerId !== null && !keepsWorker && (
                        <p className="cf-resched__swap">
                            <i className="fa-solid fa-user-pen" aria-hidden="true"></i>
                            <span>
                                <strong>{workerName} no está libre a esa hora.</strong> Ese día
                                iría otra persona del equipo, y te decimos quién al confirmar.
                            </span>
                        </p>
                    )}

                    {error && <p className="cf-dash-alert" role="alert">{error}</p>}
                </div>

                <div className="cf-resched__foot">
                    <button
                        type="button"
                        className="cf-dash-btn cf-dash-btn--ghost"
                        disabled={saving}
                        onClick={onClose}
                    >
                        Volver
                    </button>

                    <button type="submit" className="cf-dash-btn" disabled={!ready}>
                        {saving ? "Cambiando…" : "Confirmar cambio"}
                    </button>
                </div>

            </form>
        </dialog>
    );
};
