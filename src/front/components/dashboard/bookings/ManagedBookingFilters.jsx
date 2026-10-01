/**
 * BARRA DE FILTROS DE RESERVAS (ENCARGADO).
 *
 * Arriba las tres pestañas con su número, y a la derecha el buscador y
 * tres desplegables: estado, servicio y fechas. Debajo, lo que se está
 * filtrando en pastillas que se quitan una a una.
 *
 * Estado y servicio son de SELECCIÓN MÚLTIPLE: se marcan varios y el
 * panel no se cierra al marcar, porque casi nunca se elige uno solo.
 * Cada opción enseña cuántas reservas hay, contadas sin su propio filtro
 * pero con los demás: si contaran lo ya filtrado, al marcar una el resto
 * se pondría a cero y parecería que no hay nada más.
 *
 * Solo pinta y avisa: quien filtra de verdad es la API.
 *
 *   filters: { tab, q, status[], service[], from, to }  ·  onChange: los nuevos
 *   counts:  los tres números de las pestañas
 *   facets:  { status: {...}, service: {...} }
 *
 * Estilos: dashboard.css (cf-bookings__*).
 */

import { useEffect, useRef, useState } from "react"

const TABS = [
    { value: "all", label: "Todas" },
    { value: "affected", label: "Afectadas", warn: true },
    { value: "incident", label: "Con incidencia", warn: true },
]

const ESTADOS = [
    { value: "pending", label: "Pendientes" },
    { value: "done", label: "Realizadas" },
    { value: "cancelled", label: "Canceladas" },
]

/** Los mismos tres atajos que ya tiene "Mis servicios" del cliente. */
const isoOf = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

const ATAJOS = [
    {
        value: "month", label: "Este mes",
        range: (hoy) => ({
            from: isoOf(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
            to: isoOf(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)),
        }),
    },
    {
        value: "quarter", label: "Últimos 3 meses",
        range: (hoy) => ({
            from: isoOf(new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)),
            to: isoOf(hoy),
        }),
    },
    {
        value: "year", label: "Este año",
        range: (hoy) => ({ from: `${hoy.getFullYear()}-01-01`, to: `${hoy.getFullYear()}-12-31` }),
    },
]

const diaCorto = (iso) =>
    new Date(`${iso}T12:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" }).replace(".", "")

export const ManagedBookingFilters = ({ filters, counts, facets, services, onChange }) => {
    // Cuál de los tres paneles está abierto, o null. Solo uno: dos a la
    // vez se solaparían.
    const [abierto, setAbierto] = useState(null)
    const barra = useRef(null)

    const set = (cambios) => onChange({ ...filters, ...cambios })

    // Se cierra al pulsar fuera y con Escape, como cualquier menú. Los
    // dos oyentes se quitan al cerrarlo.
    useEffect(() => {
        if (!abierto) return

        const fuera = (event) => {
            if (!barra.current?.contains(event.target)) setAbierto(null)
        }

        const escape = (event) => {
            if (event.key === "Escape") setAbierto(null)
        }

        document.addEventListener("mousedown", fuera)
        document.addEventListener("keydown", escape)

        return () => {
            document.removeEventListener("mousedown", fuera)
            document.removeEventListener("keydown", escape)
        }
    }, [abierto])

    /** Marca o desmarca un valor de una de las dos listas. */
    const alternar = (campo, valor) => {
        const lista = filters[campo]

        set({ [campo]: lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor] })
    }

    const atajoPuesto = ATAJOS.find((a) => {
        const r = a.range(new Date())
        return r.from === filters.from && r.to === filters.to
    })

    const rotuloFechas = () => {
        if (atajoPuesto) return atajoPuesto.label
        if (filters.from && filters.to) return `${diaCorto(filters.from)} – ${diaCorto(filters.to)}`
        if (filters.from) return `Desde el ${diaCorto(filters.from)}`
        if (filters.to) return `Hasta el ${diaCorto(filters.to)}`

        return "Fechas"
    }

    /** El botón dice qué hay elegido: nada, el nombre si es uno, o cuántos. */
    const rotulo = (lista, porDefecto, nombre) =>
        lista.length === 0 ? porDefecto
            : lista.length === 1 ? nombre(lista[0])
                : `${porDefecto} · ${lista.length}`

    const nombreServicio = (id) => services.find((s) => String(s.service_id) === String(id))?.name || "Servicio"

    // Una pastilla por valor elegido, no una por filtro: así se quita
    // "Pendientes" sin perder "Canceladas".
    const puestos = [
        ...(filters.q.trim() ? [{ campo: "q", valor: "", texto: `«${filters.q.trim()}»` }] : []),
        ...filters.status.map((v) => ({
            campo: "status", valor: v, texto: ESTADOS.find((e) => e.value === v).label,
        })),
        ...filters.service.map((v) => ({ campo: "service", valor: v, texto: nombreServicio(v) })),
        ...(filters.from || filters.to ? [{ campo: "dates", valor: "", texto: rotuloFechas() }] : []),
    ]

    const quitar = ({ campo, valor }) => {
        if (campo === "q") return set({ q: "" })
        if (campo === "dates") return set({ from: "", to: "" })

        set({ [campo]: filters[campo].filter((v) => v !== valor) })
    }

    const panel = (cual) => (abierto === cual ? null : cual)

    return (
        <>
            <div className="cf-bookings__toolbar" ref={barra}>
                {/* aria-pressed y no role="tab": son filtros de una misma lista. */}
                <div className="cf-services__tabs" role="group" aria-label="Filtrar reservas">
                    {TABS.map((tab) => (
                        <button
                            key={tab.value}
                            type="button"
                            className="cf-services__tab"
                            aria-pressed={filters.tab === tab.value}
                            onClick={() => set({ tab: tab.value })}
                        >
                            {tab.label}
                            {/* Las dos de problemas, en terracota: son las que piden algo. */}
                            <span className={`cf-services__count${
                                tab.warn && counts[tab.value] > 0 ? " cf-dash-count--attention" : ""
                            }`}>
                                {counts[tab.value]}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="cf-bookings__controls">
                    <label className="cf-bookings__search">
                        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                        <span className="sr-only">Buscar reservas</span>
                        <input
                            type="search"
                            placeholder="Buscar cliente, trabajador o servicio"
                            value={filters.q}
                            onChange={(event) => set({ q: event.target.value })}
                        />
                    </label>

                    {/* ---------- ESTADO ---------- */}
                    <div className="cf-bookings__drop">
                        <button
                            type="button"
                            className="cf-bookings__drop-btn"
                            data-on={filters.status.length > 0}
                            aria-expanded={abierto === "status"}
                            onClick={() => setAbierto(panel("status"))}
                        >
                            {rotulo(filters.status, "Estado", (v) => ESTADOS.find((e) => e.value === v).label)}
                            <i className="fa-solid fa-chevron-down" aria-hidden="true" />
                        </button>

                        <div className="cf-bookings__pop" hidden={abierto !== "status"}>
                            <div className="cf-bookings__pop-head">
                                <span>Estado</span>
                                <button type="button" onClick={() => set({ status: [] })}>Quitar</button>
                            </div>
                            {ESTADOS.map((e) => (
                                <label className="cf-bookings__opt" key={e.value}>
                                    <input
                                        type="checkbox"
                                        checked={filters.status.includes(e.value)}
                                        onChange={() => alternar("status", e.value)}
                                    />
                                    {e.label}
                                    <span className="cf-bookings__opt-n">{facets.status?.[e.value] ?? 0}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* ---------- SERVICIO ---------- */}
                    <div className="cf-bookings__drop">
                        <button
                            type="button"
                            className="cf-bookings__drop-btn"
                            data-on={filters.service.length > 0}
                            aria-expanded={abierto === "service"}
                            onClick={() => setAbierto(panel("service"))}
                        >
                            {rotulo(filters.service, "Servicio", (v) => nombreServicio(v).replace("Limpieza ", ""))}
                            <i className="fa-solid fa-chevron-down" aria-hidden="true" />
                        </button>

                        <div className="cf-bookings__pop" hidden={abierto !== "service"}>
                            <div className="cf-bookings__pop-head">
                                <span>Tipo de servicio</span>
                                <button type="button" onClick={() => set({ service: [] })}>Quitar</button>
                            </div>
                            {services.map((s) => (
                                <label className="cf-bookings__opt" key={s.service_id}>
                                    <input
                                        type="checkbox"
                                        checked={filters.service.includes(String(s.service_id))}
                                        onChange={() => alternar("service", String(s.service_id))}
                                    />
                                    {s.name}
                                    <span className="cf-bookings__opt-n">
                                        {facets.service?.[String(s.service_id)] ?? 0}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* ---------- FECHAS ---------- */}
                    <div className="cf-bookings__drop">
                        <button
                            type="button"
                            className="cf-bookings__drop-btn"
                            data-on={Boolean(filters.from || filters.to)}
                            aria-expanded={abierto === "dates"}
                            onClick={() => setAbierto(panel("dates"))}
                        >
                            <i className="fa-regular fa-calendar" aria-hidden="true" />
                            {rotuloFechas()}
                            <i className="fa-solid fa-chevron-down" aria-hidden="true" />
                        </button>

                        <div className="cf-bookings__pop" hidden={abierto !== "dates"}>
                            <div className="cf-bookings__pop-head">
                                <span>Fechas</span>
                                <button type="button" onClick={() => set({ from: "", to: "" })}>Quitar</button>
                            </div>

                            <div className="cf-bookings__quick">
                                {ATAJOS.map((a) => (
                                    <button
                                        key={a.value}
                                        type="button"
                                        aria-pressed={atajoPuesto?.value === a.value}
                                        onClick={() => set(a.range(new Date()))}
                                    >
                                        {a.label}
                                    </button>
                                ))}
                            </div>

                            <div className="cf-bookings__range">
                                <label className="cf-bookings__field">
                                    <span>Desde</span>
                                    <input
                                        type="date"
                                        className="cf-dash-input"
                                        value={filters.from}
                                        onChange={(event) => set({ from: event.target.value })}
                                    />
                                </label>
                                <label className="cf-bookings__field">
                                    <span>Hasta</span>
                                    <input
                                        type="date"
                                        className="cf-dash-input"
                                        value={filters.to}
                                        onChange={(event) => set({ to: event.target.value })}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {puestos.length > 0 && (
                <div className="cf-bookings__chips">
                    <span className="cf-bookings__chips-label">Filtrando por</span>

                    {puestos.map((p) => (
                        <button
                            key={`${p.campo}-${p.valor}`}
                            type="button"
                            className="cf-bookings__chip"
                            onClick={() => quitar(p)}
                        >
                            {p.texto}
                            <span aria-hidden="true">×</span>
                            <span className="sr-only">Quitar este filtro</span>
                        </button>
                    ))}

                    <button
                        type="button"
                        className="cf-bookings__chips-clear"
                        onClick={() => set({ q: "", status: [], service: [], from: "", to: "" })}
                    >
                        Quitar todos
                    </button>
                </div>
            )}
        </>
    )
}
