/**
 * QUIÉN LO HIZO.
 *
 * El trabajador asignado, con su foto si la ha subido. Si no, sus
 * iniciales en el mismo círculo terracota que usa el resto del panel.
 *
 * El cliente ve el nombre y la inicial del apellido, nunca más: el
 * backend ya manda "Ana G." y no el nombre completo.
 *
 * Estilos: dashboard.css (cf-bookworker).
 */

import { initialsOf } from "./bookingFormat";

export const BookingWorker = ({ booking }) => (
    <section className="cf-bookblock">
        <h2 className="cf-bookblock__title">Quién lo hizo</h2>

        <div className="cf-bookworker">
            {booking.worker_avatar_url ? (
                <img
                    className="cf-bookworker__photo"
                    src={booking.worker_avatar_url}
                    alt=""
                />
            ) : (
                <span className="cf-bookworker__initials" aria-hidden="true">
                    {initialsOf(booking.worker_name)}
                </span>
            )}

            <div>
                <p className="cf-bookworker__name">
                    {booking.worker_name || "Sin asignar"}
                </p>
                <p className="cf-bookworker__role">Personal de limpieza</p>
            </div>
        </div>
    </section>
);
