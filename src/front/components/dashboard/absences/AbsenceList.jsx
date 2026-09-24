/**
 * LAS AUSENCIAS DE UN TRABAJADOR, EN DOS GRUPOS (#75).
 *
 *   Ahora y próximas: las que afectan hoy o más adelante, de la más cercana
 *                     a la más lejana. Son las que importan.
 *   Pasadas:          las que ya terminaron, de la más reciente a la más antigua.
 *
 * Estilos: dashboard.css (cf-absences__*).
 */

import { AbsenceRow, isPast } from "./AbsenceRow"

const Group = ({ title, absences, ...rowProps }) => (
    <div className="cf-absences__group">
        <h2 className="cf-absences__group-title">
            {title} <span>{absences.length}</span>
        </h2>
        <ul className="cf-absences__list">
            {absences.map((absence) => (
                <AbsenceRow key={absence.absence_id} absence={absence} {...rowProps} />
            ))}
        </ul>
    </div>
)

export const AbsenceList = ({ absences, today, disabled, onEdit, onRemove }) => {
    const byStart = [...absences].sort((a, b) => a.starts_on.localeCompare(b.starts_on))

    const upcoming = byStart.filter((absence) => !isPast(absence, today))
    const past = byStart.filter((absence) => isPast(absence, today)).reverse()

    const rowProps = { today, disabled, onEdit, onRemove }

    return (
        <>
            {upcoming.length > 0 && <Group title="Ahora y próximas" absences={upcoming} {...rowProps} />}
            {past.length > 0 && <Group title="Pasadas" absences={past} {...rowProps} />}
        </>
    )
}
