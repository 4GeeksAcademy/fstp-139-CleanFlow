/**
 * CALENDARIO DE HUECOS (#14).
 *
 * Un mes con sus días: los que tienen hueco se pueden pulsar y los que no,
 * salen tachados. No pide nada a la API ni decide nada: recibe los huecos
 * ya calculados y avisa del día que se elige.
 *
 *   days      {"2026-10-05": [{ start, options }]}, tal cual lo da la API
 *   month     "2026-10", el mes que se está viendo
 *   chosen    el día elegido, "2026-10-05", o ""
 *   spill     días que ocuparía la reserva además del elegido
 *
 * Estilos: dashboard.css (cf-booking__*).
 */

// Lunes primero, como en España y como Shift.days en el backend.
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

const MONTH_NAMES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]

/** "2026-10" -> { year: 2026, month: 10 }. */
const parseMonth = (month) => {
    const [year, number] = month.split("-").map(Number)

    return { year, number }
}

/** "2026-10" y 5 -> "2026-10-05", la clave que usa la API. */
const dayKey = (month, day) => `${month}-${String(day).padStart(2, "0")}`

/** Lunes = 0 ... domingo = 6: las casillas vacías antes del día 1. */
const firstColumn = (year, number) => (new Date(year, number - 1, 1).getDay() + 6) % 7

const daysInMonth = (year, number) => new Date(year, number, 0).getDate()

export const BookingCalendar = ({
    days,
    month,
    chosen,
    spill = [],
    loading,
    canGoBack,
    canGoForward,
    onMonthChange,
    onChoose,
}) => {
    const { year, number } = parseMonth(month)

    return (
        <>
            <div className="cf-booking__month">
                <button
                    type="button"
                    className="cf-booking__arrow"
                    onClick={() => onMonthChange(-1)}
                    disabled={!canGoBack}
                    aria-label="Mes anterior"
                >
                    <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                </button>

                <span className="cf-booking__month-name" aria-live="polite">
                    {MONTH_NAMES[number - 1]} de {year}
                </span>

                <button
                    type="button"
                    className="cf-booking__arrow"
                    onClick={() => onMonthChange(1)}
                    disabled={!canGoForward}
                    aria-label="Mes siguiente"
                >
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </button>
            </div>

            <div className="cf-booking__weekdays" aria-hidden="true">
                {WEEKDAYS.map((weekday) => (
                    <span key={weekday}>{weekday}</span>
                ))}
            </div>

            <div className="cf-booking__days" aria-busy={loading}>
                {/* Huecos hasta el día 1: el mes no empieza en lunes. */}
                {Array.from({ length: firstColumn(year, number) }, (_, index) => (
                    <span className="cf-booking__day cf-booking__day--empty" key={`hueco-${index}`} />
                ))}

                {Array.from({ length: daysInMonth(year, number) }, (_, index) => {
                    const day = index + 1
                    const key = dayKey(month, day)
                    const free = Boolean(days[key])

                    let className = "cf-booking__day"

                    if (key === chosen) className += " cf-booking__day--chosen"
                    else if (spill.includes(key)) className += " cf-booking__day--spill"

                    return (
                        <button
                            type="button"
                            className={className}
                            key={key}
                            disabled={!free || loading}
                            aria-pressed={key === chosen}
                            aria-label={free ? `${day}, con huecos` : `${day}, sin huecos`}
                            onClick={() => onChoose(key)}
                        >
                            {day}
                        </button>
                    )
                })}
            </div>
        </>
    )
}
