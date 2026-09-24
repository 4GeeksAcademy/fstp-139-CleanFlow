/**
 * DÓNDE Y CON QUIÉN.
 *
 * La dirección completa, los datos del cliente y sus notas. Es lo que el
 * trabajador mira antes de salir de casa.
 *
 * El teléfono solo se enseña el día del servicio: lo necesita para avisar
 * de que llega, no el resto del mes. Quien decide eso es el backend, que
 * solo lo manda ese día; aquí únicamente se pinta lo que llegue.
 *
 * Estilos: dashboard.css, sección 10 (cf-wrow y cf-wnotes).
 */

/** "Calle de Alcalá, 118 · 3.º B" */
const streetOf = (address) =>
    [`${address.street}, ${address.number}`, address.floor].filter(Boolean).join(" · ");

export const WorkerWhere = ({ booking }) => (
    <section className="cf-wblock">
        <h2 className="cf-wblock__title">Dónde y con quién</h2>

        <dl style={{ display: "grid", margin: 0 }}>
            <div className="cf-wrow">
                <dt>Dirección</dt>
                <dd>
                    {streetOf(booking.address)}
                    <br />
                    {booking.address.postal_code} {booking.address.city}
                </dd>
            </div>

            {/* Cómo entrar: el portero, la llave del vecino, el timbre que
                no suena. Muchas veces es el dato más útil de la pantalla. */}
            {booking.address.access_notes && (
                <div className="cf-wrow">
                    <dt>Cómo entrar</dt>
                    <dd>{booking.address.access_notes}</dd>
                </div>
            )}

            {booking.client_name && (
                <div className="cf-wrow">
                    <dt>Cliente</dt>
                    <dd>{booking.client_name}</dd>
                </div>
            )}

            <div className="cf-wrow">
                <dt>Teléfono</dt>
                <dd>
                    {booking.client_phone ? (
                        <a href={`tel:${booking.client_phone}`}>{booking.client_phone}</a>
                    ) : (
                        <span className="cf-wrow__locked">
                            <i className="fa-solid fa-lock" aria-hidden="true"></i>
                            El día del servicio
                        </span>
                    )}
                </dd>
            </div>
        </dl>

        {booking.client_notes && (
            <p className="cf-wnotes">«{booking.client_notes}»</p>
        )}
    </section>
);
