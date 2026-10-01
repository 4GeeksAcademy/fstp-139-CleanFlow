/**
 * UNA FILA DEL LISTADO DE CLIENTES.
 *
 * Cerrada enseña lo que se mira de un vistazo: quién es, cómo
 * contactarle, cuántos servicios lleva y dónde vive. Abierta, el resto
 * de sus direcciones y su historial.
 *
 * La fila se despliega en vez de abrir una ficha aparte porque así el
 * mismo gesto resuelve las dos cosas: ver el detalle y ver las
 * direcciones que no caben en la fila.
 *
 * No guarda nada: avisa a la página con onSwitch, que es quien decide si
 * hay que confirmar.
 *
 *   client:   un cliente de GET /api/manage/clients
 *   query:    lo buscado, para resaltarlo en el nombre
 *   busy:     true mientras se guarda su estado
 *   onSwitch(client): al tocar el interruptor
 *
 * Estilos: dashboard.css (cf-clients__*).
 */

import { useId, useState } from "react"
import { Avatar } from "../Avatar"
import { Highlight } from "../SearchBox"

/** "2026-03-12T09:00:00" -> "12 mar 2026". Sin fecha, una raya. */
const fecha = (iso) => {
    if (!iso) return "—"

    return new Date(iso).toLocaleDateString("es-ES", {
        day: "numeric", month: "short", year: "numeric",
    })
}

/** "Calle Mayor 12, 4.º" a partir de las piezas que guarda la dirección. */
const calleDe = (direccion) =>
    [`${direccion.street} ${direccion.number}`, direccion.floor].filter(Boolean).join(", ")

export const ClientRow = ({ client, query, busy, onSwitch }) => {
    const [abierta, setAbierta] = useState(false)

    // useId y no el user_id: el panel y su botón se enlazan entre ellos,
    // y así no hay que inventar un identificador único a mano.
    const panelId = useId()
    const switchId = `client-status-${client.user_id}`

    const nombre = `${client.name} ${client.last_name}`
    const direcciones = client.addresses || []
    const principal = direcciones.find((d) => d.is_default) || direcciones[0]
    const otras = direcciones.length - (principal ? 1 : 0)

    return (
        <li className={`cf-clients__row${client.is_active ? "" : " cf-clients__row--inactive"}`}>
            <div className="cf-clients__main">
                <button
                    type="button"
                    className="cf-clients__chev"
                    aria-expanded={abierta}
                    aria-controls={panelId}
                    onClick={() => setAbierta((actual) => !actual)}
                >
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    <span className="sr-only">
                        {abierta ? `Ocultar los datos de ${nombre}` : `Ver los datos de ${nombre}`}
                    </span>
                </button>

                <div className="cf-clients__person">
                    <Avatar user={client} size="md" />

                    <div className="cf-clients__who">
                        <p className="cf-clients__name">
                            <Highlight text={nombre} query={query} />
                        </p>
                        <span className="cf-clients__since">Alta {fecha(client.created_at)}</span>
                    </div>
                </div>

                <p className="cf-clients__contact">
                    {client.email}
                    <span className="cf-clients__phone">{client.phone || "Sin teléfono"}</span>
                </p>

                {/* El número son servicios REALIZADOS. Los pendientes y los
                    cancelados no suman: contarían como clientela que no existe. */}
                <p className="cf-clients__done">
                    {client.completed_count > 0 ? (
                        <>
                            <strong>{client.completed_count}</strong>
                            <span className="cf-clients__last">últ. {fecha(client.last_completed_at)}</span>
                        </>
                    ) : (
                        <span className="cf-clients__none">Ninguno</span>
                    )}
                </p>

                <p className="cf-clients__addr">
                    {principal ? (
                        <>
                            {calleDe(principal)}
                            {otras > 0 && (
                                <span className="cf-clients__more">
                                    +{otras}
                                    <span className="sr-only">
                                        {otras === 1 ? " dirección más" : " direcciones más"}
                                    </span>
                                </span>
                            )}
                            <span className="cf-clients__city">
                                {principal.postal_code} {principal.city}
                            </span>
                        </>
                    ) : (
                        <span className="cf-clients__none">Sin direcciones</span>
                    )}
                </p>

                <div>
                    <label className="cf-dash-switch" htmlFor={switchId}>
                        <input
                            id={switchId}
                            type="checkbox"
                            role="switch"
                            checked={client.is_active}
                            onChange={() => onSwitch(client)}
                            disabled={busy}
                        />
                        <span className="cf-dash-switch__text">
                            {client.is_active ? "Activo" : "De baja"}
                        </span>
                    </label>
                </div>
            </div>

            {/* Se oculta en vez de quitarlo del todo: sus datos ya vinieron
                con el listado, así que no hay nada que cargar al abrirlo y
                montarlo y desmontarlo no ahorraría ninguna petición. */}
            <div className="cf-clients__panel" id={panelId} hidden={!abierta}>
                <div>
                    <h3 className="cf-clients__subtitle">Direcciones</h3>

                    {direcciones.length === 0 ? (
                        <p className="cf-clients__none">Todavía no ha guardado ninguna.</p>
                    ) : (
                        <ul className="cf-clients__addrs">
                            {direcciones.map((direccion) => (
                                <li
                                    key={direccion.address_id}
                                    className={`cf-clients__addr-item${
                                        direccion.is_default ? " cf-clients__addr-item--default" : ""
                                    }`}
                                >
                                    {direccion.is_default && (
                                        <span className="cf-clients__addr-tag">Principal</span>
                                    )}
                                    <span>{calleDe(direccion)}</span>
                                    <span className="cf-clients__city">
                                        {direccion.postal_code} {direccion.city}
                                    </span>
                                    {direccion.access_notes && (
                                        <span className="cf-clients__notes">{direccion.access_notes}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div>
                    <h3 className="cf-clients__subtitle">Su historial</h3>

                    <dl className="cf-clients__facts">
                        <dt>Cliente desde</dt>
                        <dd>{fecha(client.created_at)}</dd>
                        <dt>Servicios realizados</dt>
                        <dd>{client.completed_count}</dd>
                        <dt>Último servicio</dt>
                        <dd>{fecha(client.last_completed_at)}</dd>
                        <dt>Correo</dt>
                        <dd>{client.email}</dd>
                        <dt>Teléfono</dt>
                        <dd>{client.phone || "—"}</dd>
                    </dl>
                </div>

                {/* El aviso también aquí y no solo en el diálogo: así se ve
                    mientras decides, antes de tocar el interruptor. */}
                {client.pending_count > 0 && (
                    <p className="cf-clients__pending">
                        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                        <span>
                            Tiene <strong>
                                {client.pending_count}{" "}
                                {client.pending_count === 1 ? "servicio pendiente" : "servicios pendientes"}
                            </strong>, el primero el {fecha(client.next_pending_at)}. Si le das de baja, se cancelan.
                        </span>
                    </p>
                )}
            </div>
        </li>
    )
}
