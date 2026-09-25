/**
 * RESUMEN "ASÍ APARECE EN EL EQUIPO" (EDITAR TRABAJADOR) · #75.
 *
 * La columna de la derecha del formulario, como el "Así lo verá el
 * cliente" de servicios. Se actualiza mientras se escribe.
 *
 *   worker:   lo que hay en el formulario, más la foto y la valoración
 *   shift:    el turno elegido, o null
 *   onAbsences: si llega, se pinta el botón "Ver sus ausencias"
 *
 * Estilos: dashboard.css (cf-worker-form__aside, cf-worker-form__facts).
 */

import { Avatar } from "../Avatar"

// "2024-03-01" -> "1 mar 2024". En UTC para que el huso no mueva el día.
const formatDate = (value) => {
    const [year, month, day] = value.split("-").map(Number)

    return new Date(Date.UTC(year, month - 1, day))
        .toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
        .replace(".", "")
}

// "4.8" -> "4,8"
const formatRating = (rating) =>
    rating.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const WorkerSummary = ({ worker, shift, isEditing, onAbsences }) => {
    const fullName = `${worker.name} ${worker.last_name}`.trim()
    const isManager = worker.role === "manager"

    const job = worker.position || (isManager ? "Encargado" : "Sin puesto")
    const shiftText = shift ? `${shift.name} ${shift.start_time}–${shift.end_time}` : "Sin turno"

    return (
        <aside className="cf-worker-form__aside" aria-label="Resumen del trabajador">
            <p className="cf-worker-form__aside-label">
                {isEditing ? "Así aparece en el equipo" : "Así aparecerá en el equipo"}
            </p>

            <div className="cf-worker-form__who">
                <Avatar user={worker} size="md" />
                <div className="cf-workers__who">
                    <p className="cf-workers__name">{fullName || "Sin nombre"}</p>
                    <span className="cf-workers__email">{worker.email || "Sin correo"}</span>
                </div>
            </div>

            <dl className="cf-worker-form__facts">
                <div>
                    <dt>Puesto y turno</dt>
                    <dd>
                        {job} · {shiftText}
                    </dd>
                </div>

                {/* El encargado no hace servicios: sin valoración, su rol. */}
                {isManager ? (
                    <div>
                        <dt>Rol</dt>
                        <dd>Encargado</dd>
                    </div>
                ) : (
                    <div>
                        <dt>Valoración</dt>
                        <dd>
                            {worker.rating != null ? (
                                <span className="cf-workers__rating">
                                    <i className="fa-solid fa-star" aria-hidden="true" />
                                    <strong>{formatRating(worker.rating)}</strong>
                                    <span>
                                        ({worker.reviews_count} {worker.reviews_count === 1 ? "reseña" : "reseñas"})
                                    </span>
                                </span>
                            ) : (
                                <span className="cf-workers__rating--none">Sin valoraciones todavía</span>
                            )}
                        </dd>
                    </div>
                )}

                {worker.hire_date && (
                    <div>
                        <dt>En el equipo desde</dt>
                        <dd>{formatDate(worker.hire_date)}</dd>
                    </div>
                )}
            </dl>

            {onAbsences && (
                <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={onAbsences}>
                    <i className="fa-solid fa-calendar-xmark" aria-hidden="true" />
                    Ver sus ausencias
                </button>
            )}
        </aside>
    )
}
