/**
 * CUÁNTO PAGUÉ.
 *
 * Horas, precio por hora y total. Los tres vienen congelados en la
 * reserva desde que se contrató: si el servicio sube de precio después,
 * esta reserva conserva el suyo.
 *
 * Estilos: dashboard.css (cf-bookrows).
 */

import { EUROS } from "./bookingFormat";

export const BookingPrice = ({ booking }) => (
    <section className="cf-bookblock">
        <h2 className="cf-bookblock__title">Cuánto pagué</h2>

        <dl className="cf-bookrows">
            <div className="cf-bookrow">
                <dt>Horas contratadas</dt>
                <dd>{booking.hours} h</dd>
            </div>

            <div className="cf-bookrow">
                <dt>Precio por hora</dt>
                <dd>{EUROS.format(booking.hourly_rate)}</dd>
            </div>

            <div className="cf-bookrow cf-bookrow--total">
                <dt>Total</dt>
                <dd>{EUROS.format(booking.total_price)}</dd>
            </div>
        </dl>
    </section>
);
