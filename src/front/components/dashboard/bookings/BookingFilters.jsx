/**
 * BARRA DE FILTROS DE MIS SERVICIOS.
 *
 * Una sola línea: el estado a la izquierda y, a la derecha, buscar y un
 * botón que despliega las fechas. Debajo, lo que se está filtrando, en
 * pastillas que se quitan una a una.
 *
 * Solo pinta y avisa: quien filtra de verdad es la página.
 *
 *   filters: { tab, query, from, to }   ·  onChange: recibe los nuevos
 *
 * Estilos: dashboard.css, sección 9 (cf-myservices__toolbar y cf-dates).
 */

import { useEffect, useRef, useState } from "react";

// Las cuatro pestañas. "Pendientes" incluye las que están en curso: un
// servicio que se está haciendo ahora no está ni hecho ni cancelado.
export const TABS = [
    { value: "all", label: "Todos" },
    { value: "pending", label: "Pendientes" },
    { value: "done", label: "Realizados" },
    { value: "cancelled", label: "Cancelados" },
];

// Sin filtros puestos. Sirve para arrancar y para "Quitar todo".
export const NO_FILTERS = { tab: "all", query: "", from: "", to: "" };

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun",
                "jul", "ago", "sep", "oct", "nov", "dic"];

// "2026-09-22" -> "22 sep"
const shortDay = (isoDate) =>
    `${Number(isoDate.slice(8, 10))} ${MONTHS[Number(isoDate.slice(5, 7)) - 1]}`;

/** El rango, dicho en corto: "22 – 24 sep", "desde el 22 sep"… */
const rangeLabel = ({ from, to }) => {
    if (from && to) return `${shortDay(from)} – ${shortDay(to)}`;
    if (from) return `Desde el ${shortDay(from)}`;
    if (to) return `Hasta el ${shortDay(to)}`;

    return "";
};

// Las fechas se escriben a mano para no moverlas de huso, igual que en
// el resto de la pantalla.
const isoOf = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Los atajos, que resuelven lo habitual con un solo clic. */
const SHORTCUTS = [
    {
        value: "month",
        label: "Este mes",
        range: (today) => ({
            from: isoOf(new Date(today.getFullYear(), today.getMonth(), 1)),
            to: isoOf(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
        }),
    },
    {
        value: "quarter",
        label: "Últimos 3 meses",
        range: (today) => ({
            from: isoOf(new Date(today.getFullYear(), today.getMonth() - 2, 1)),
            to: isoOf(today),
        }),
    },
    {
        value: "year",
        label: "Este año",
        range: (today) => ({
            from: `${today.getFullYear()}-01-01`,
            to: `${today.getFullYear()}-12-31`,
        }),
    },
];

export const BookingFilters = ({ filters, counts, total, shown, onChange }) => {
    const [open, setOpen] = useState(false);
    const dates = useRef(null);

    const range = rangeLabel(filters);
    const filtering = Boolean(filters.query || filters.from || filters.to);

    // El panel se cierra al pulsar fuera o con Escape, como cualquier
    // menú. Los dos oyentes se quitan al cerrarlo.
    useEffect(() => {
        if (!open) return;

        const closeOutside = (event) => {
            if (!dates.current?.contains(event.target)) setOpen(false);
        };

        const closeOnEscape = (event) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", closeOutside);
        document.addEventListener("keydown", closeOnEscape);

        return () => {
            document.removeEventListener("mousedown", closeOutside);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [open]);

    const set = (changes) => onChange({ ...filters, ...changes });

    // El atajo que coincide con el rango puesto, para marcarlo.
    const today = new Date();
    const activeShortcut = SHORTCUTS.find((shortcut) => {
        const { from, to } = shortcut.range(today);

        return from === filters.from && to === filters.to;
    });

    return (
        <>
            <div className="cf-myservices__toolbar">

                {/* aria-pressed y no role="tab": son filtros de una lista. */}
                <div className="cf-services__tabs">
                    {TABS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className="cf-services__tab"
                            aria-pressed={filters.tab === option.value}
                            onClick={() => set({ tab: option.value })}
                        >
                            {option.label}
                            <span className="cf-services__count">{counts[option.value]}</span>
                        </button>
                    ))}
                </div>

                <div className="cf-myservices__tools">

                    {/* El buscador del panel, sin sugerencias: con pocas
                        reservas, la propia lista ya es la respuesta. */}
                    <div className="cf-dash-search">
                        <i className="fa-solid fa-magnifying-glass cf-dash-search__icon" aria-hidden="true"></i>
                        <input
                            id="my-services-search"
                            type="search"
                            className="cf-dash-search__input"
                            placeholder="Buscar servicio o trabajador"
                            aria-label="Buscar entre mis servicios"
                            value={filters.query}
                            onChange={(event) => set({ query: event.target.value })}
                        />
                        {filters.query && (
                            <button
                                type="button"
                                className="cf-dash-search__clear"
                                aria-label="Borrar la búsqueda"
                                onClick={() => set({ query: "" })}
                            >
                                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                            </button>
                        )}
                    </div>

                    <div className="cf-dates" ref={dates}>
                        <button
                            type="button"
                            className={`cf-dates__btn${range ? " cf-dates__btn--on" : ""}`}
                            aria-expanded={open}
                            onClick={() => setOpen((previous) => !previous)}
                        >
                            <i className="fa-regular fa-calendar" aria-hidden="true"></i>
                            {range || "Fechas"}
                            <i className="fa-solid fa-chevron-down" aria-hidden="true"></i>
                        </button>

                        {open && (
                            <div className="cf-dates__panel">
                                <div className="cf-dates__quick">
                                    {SHORTCUTS.map((shortcut) => (
                                        <button
                                            key={shortcut.value}
                                            type="button"
                                            aria-pressed={activeShortcut?.value === shortcut.value}
                                            onClick={() => set(shortcut.range(new Date()))}
                                        >
                                            {shortcut.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="cf-dates__range">
                                    <label className="cf-dates__field">
                                        <span>Desde</span>
                                        <input
                                            type="date"
                                            className="cf-dash-input"
                                            value={filters.from}
                                            onChange={(event) => set({ from: event.target.value })}
                                        />
                                    </label>
                                    <label className="cf-dates__field">
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
                        )}
                    </div>
                </div>
            </div>

            {/* Sin filtros no hay nada que contar ni que deshacer. */}
            {filtering && (
                <div className="cf-myservices__active">
                    {filters.query && (
                        <span className="cf-myservices__chip">
                            «{filters.query}»
                            <button type="button" aria-label="Quitar la búsqueda" onClick={() => set({ query: "" })}>
                                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                            </button>
                        </span>
                    )}

                    {range && (
                        <span className="cf-myservices__chip">
                            {range}
                            <button type="button" aria-label="Quitar las fechas" onClick={() => set({ from: "", to: "" })}>
                                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                            </button>
                        </span>
                    )}

                    <span className="cf-myservices__count">{shown} de {total}</span>

                    <button
                        type="button"
                        className="cf-myservices__clear"
                        onClick={() => onChange({ ...NO_FILTERS, tab: filters.tab })}
                    >
                        Quitar todo
                    </button>
                </div>
            )}
        </>
    );
};
