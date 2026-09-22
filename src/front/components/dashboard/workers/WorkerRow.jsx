/**
 * UNA FILA DEL LISTADO DE TRABAJADORES (#75).
 *
 * Nombre y correo, puesto y turno, valoración, interruptor de estado y
 * botones. No guarda nada: avisa a la página con onSwitch.
 *
 *   worker:  un trabajador de GET /api/workers
 *   query:   lo buscado, para resaltarlo en el nombre
 *   isSelf:  true si es la cuenta de quien mira (no puede desactivarse)
 *   busy:    true mientras se guarda su estado
 *   onSwitch(worker): al tocar el interruptor (la página decide si confirma)
 *
 * Estilos: dashboard.css (cf-workers__*).
 */

import { useNavigate } from "react-router-dom"
import { Avatar } from "../Avatar"
import { Highlight } from "../SearchBox"

// "4.8" -> "4,8": la nota con coma y siempre con un decimal.
const formatRating = (rating) =>
    rating.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** "Mañana · 06:00–14:00", o "Sin turno". */
const shiftText = (worker) =>
    worker.shift_name ? `${worker.shift_name} · ${worker.shift_start}–${worker.shift_end}` : "Sin turno"

export const WorkerRow = ({ worker, query, isSelf, busy, onSwitch }) => {
    const navigate = useNavigate()

    const fullName = `${worker.name} ${worker.last_name}`
    const isManager = worker.role === "manager"
    const switchId = `worker-status-${worker.worker_id}`

    return (
        <li className={`cf-workers__row${worker.is_active ? "" : " cf-workers__row--inactive"}`}>
            <div className="cf-workers__person">
                <Avatar user={worker} size="md" />

                <div className="cf-workers__who">
                    <p className="cf-workers__name">
                        <Highlight text={fullName} query={query} />
                        {worker.on_leave_today && (
                            <span className="cf-workers__tag cf-workers__tag--away">Baja en curso</span>
                        )}
                    </p>
                    <span className="cf-workers__email">{worker.email}</span>
                </div>
            </div>

            <p className="cf-workers__job">
                {worker.position || (isManager ? "Encargado" : "Sin puesto")}
                <span className="cf-workers__shift">{shiftText(worker)}</span>
            </p>

            {/* El encargado no hace servicios: sin nota, solo una raya. */}
            <div>
                {worker.rating != null ? (
                    <span className="cf-workers__rating">
                        <i className="fa-solid fa-star" aria-hidden="true" />
                        <strong>{formatRating(worker.rating)}</strong>
                        <span>
                            ({worker.reviews_count}
                            <span className="sr-only"> {worker.reviews_count === 1 ? "reseña" : "reseñas"}</span>)
                        </span>
                    </span>
                ) : (
                    <span className="cf-workers__rating--none">{isManager ? "—" : "Sin valoraciones"}</span>
                )}
            </div>

            {/* La propia cuenta no se puede desactivar: el backend lo
                rechaza (403), así que el interruptor ni se deja tocar. */}
            <div>
                <label
                    className="cf-dash-switch"
                    htmlFor={switchId}
                    title={isSelf ? "No puedes desactivar tu propia cuenta" : undefined}
                >
                    <input
                        id={switchId}
                        type="checkbox"
                        role="switch"
                        checked={worker.is_active}
                        onChange={() => onSwitch(worker)}
                        disabled={isSelf || busy}
                    />
                    <span className="cf-dash-switch__text">{worker.is_active ? "Activo" : "Desactivado"}</span>
                </label>
            </div>

            <div className="cf-workers__actions">
                {/* Ausencias solo para quien hace servicios. */}
                {!isManager && (
                    <button
                        type="button"
                        className="cf-dash-btn cf-dash-btn--ghost cf-dash-btn--sm"
                        onClick={() => navigate(`/dashboard/workers/${worker.worker_id}/absences`)}
                    >
                        <i className="fa-solid fa-calendar-xmark" aria-hidden="true" />
                        Ausencias
                    </button>
                )}
                <button
                    type="button"
                    className="cf-dash-btn cf-dash-btn--ghost cf-dash-btn--sm"
                    onClick={() => navigate(`/dashboard/workers/${worker.worker_id}/edit`)}
                >
                    <i className="fa-solid fa-pen" aria-hidden="true" />
                    Editar
                </button>
            </div>
        </li>
    )
}
