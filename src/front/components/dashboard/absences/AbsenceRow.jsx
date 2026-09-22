/**
 * UNA AUSENCIA DE LA LISTA (#75).
 *
 * Fechas (con "En curso" si afecta hoy), notas, motivo en pastilla y los
 * botones de editar y quitar. No guarda nada: avisa con onEdit y onRemove.
 *
 * Aquí viven también las cuentas de fechas, porque las usan la lista, la
 * página y el aviso de quitar. Estilos: dashboard.css (cf-absences__*).
 */

// Los tres motivos que acepta la API, con su texto.
export const REASONS = [
    { value: "vacaciones", label: "Vacaciones" },
    { value: "baja", label: "Baja" },
    { value: "otro", label: "Otro" },
]

export const reasonLabel = (value) => REASONS.find((reason) => reason.value === value)?.label || value

// ----------------------------------------------------------------------
// FECHAS
// ----------------------------------------------------------------------
// Las ausencias son días completos de Madrid ("2026-10-05", sin hora).
// Se comparan como texto, que en ese formato ordena bien.

/** Hoy en Madrid, en el mismo formato: "2026-09-22". */
export const todayInMadrid = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date())

/** "2026-10-05" -> "5 oct". Con el año solo si no es el actual. */
const formatDay = (value) => {
    const [year, month, day] = value.split("-").map(Number)
    const sameYear = year === new Date().getFullYear()

    // En UTC a propósito: así el navegador no mueve el día por su huso.
    return new Date(Date.UTC(year, month - 1, day))
        .toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            year: sameYear ? undefined : "numeric",
            timeZone: "UTC",
        })
        .replace(".", "")
}

/** "3 sep" · "12 oct → 16 oct" · "Desde el 5 oct · sin fecha de vuelta". */
export const absenceDates = (absence) => {
    if (!absence.ends_on) return `Desde el ${formatDay(absence.starts_on)} · sin fecha de vuelta`
    if (absence.ends_on === absence.starts_on) return formatDay(absence.starts_on)
    return `${formatDay(absence.starts_on)} → ${formatDay(absence.ends_on)}`
}

/** true si ya terminó: no afecta a nada. */
export const isPast = (absence, today) => absence.ends_on !== null && absence.ends_on < today

/** true si afecta hoy. */
export const isCurrent = (absence, today) => absence.starts_on <= today && !isPast(absence, today)

// ----------------------------------------------------------------------
// COMPONENTE
// ----------------------------------------------------------------------

export const AbsenceRow = ({ absence, today, disabled, onEdit, onRemove }) => {
    const past = isPast(absence, today)

    return (
        <li className={`cf-absences__row${past ? " cf-absences__row--past" : ""}`}>
            <div>
                <p className="cf-absences__dates">
                    {absenceDates(absence)}
                    {isCurrent(absence, today) && <span className="cf-absences__now">● En curso</span>}
                </p>
                <p className="cf-absences__notes">{absence.notes || "—"}</p>
            </div>

            <span className={`cf-absences__reason cf-absences__reason--${absence.reason}`}>
                {reasonLabel(absence.reason)}
            </span>

            <div className="cf-absences__row-actions">
                <button
                    type="button"
                    className="cf-dash-btn cf-dash-btn--ghost cf-dash-btn--sm"
                    onClick={() => onEdit(absence)}
                    disabled={disabled}
                >
                    <i className="fa-solid fa-pen" aria-hidden="true" />
                    Editar
                </button>
                {/* La papelera de Turnos: neutra, roja al pasar por encima. */}
                <button
                    type="button"
                    className="cf-shifts__delete"
                    onClick={() => onRemove(absence)}
                    disabled={disabled}
                    aria-label={`Quitar la ausencia: ${absenceDates(absence)}`}
                >
                    <i className="fa-solid fa-trash-can" aria-hidden="true" />
                </button>
            </div>
        </li>
    )
}
