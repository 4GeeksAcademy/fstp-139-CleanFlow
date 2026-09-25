/**
 * POR QUÉ SE CANCELÓ.
 *
 * El motivo que se escribió al cancelar, tal cual. Importa sobre todo
 * cuando cancela CleanFlow: el cliente no ha hecho nada y merece saber
 * qué pasó, no solo que su servicio ya no se hace.
 *
 * Solo se pinta en las reservas canceladas. Sin motivo escrito, el
 * bloque se queda con quién canceló, que ya es algo.
 *
 * Estilos: dashboard.css (cf-bookcancel).
 */

export const BookingCancelled = ({ booking }) => {
    if (booking.status !== "cancelled") return null;

    const byCompany = booking.cancelled_by_company;

    return (
        <section className="cf-bookblock cf-bookcancel">
            <h2 className="cf-bookblock__title">Por qué se canceló</h2>

            <p className="cf-bookcancel__who">
                <i className="fa-solid fa-circle-xmark" aria-hidden="true"></i>
                {byCompany ? "La canceló CleanFlow" : "La cancelaste tú"}
            </p>

            {booking.cancellation_reason && (
                <p className="cf-bookcancel__reason">{booking.cancellation_reason}</p>
            )}
        </section>
    );
};
