/**
 * BUSCADOR CON AUTOCOMPLETADO (DASHBOARD).
 *
 * Una lupa que abre sugerencias mientras se escribe. Lo usan
 * ManageTasks.jsx y ManageServices.jsx.
 *
 * No filtra la lista de la página: avisa del texto con `onChange` y de la
 * sugerencia elegida con `onSelect`, y la página decide qué enseñar. Para
 * que lista y sugerencias coincidan, las dos usan matchesSearch().
 *
 * Con teclado: flechas para moverse, Enter elige, Escape cierra y un
 * segundo Escape borra lo escrito.
 *
 *   options: [{ id, name, description, meta, active }]
 *     meta: la línea gris bajo el nombre en cada sugerencia.
 */

import { useRef, useState } from "react"

// Sugerencias como máximo. El resto se ve en la lista de la página.
const MAX_SUGGESTIONS = 6

// Quita tildes y mayúsculas: "Baño" y "bano" se comparan igual.
const fold = (text) => (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

/** true si alguno de los textos contiene lo buscado. Con la búsqueda vacía, siempre true. */
export const matchesSearch = (query, ...texts) => {
    const wanted = fold(query.trim())
    return !wanted || texts.some((text) => fold(text).includes(wanted))
}

/** El texto, con la parte buscada envuelta en <mark>. */
export const Highlight = ({ text, query }) => {
    const wanted = fold(query.trim())
    const start = wanted ? fold(text).indexOf(wanted) : -1

    if (start < 0) return text

    // fold() no cambia la longitud de un texto con tildes normales
    // ("ñ" pasa a "n"), así que las posiciones valen para el original.
    return (
        <>
            {text.slice(0, start)}
            <mark className="cf-dash-mark">{text.slice(start, start + wanted.length)}</mark>
            {text.slice(start + wanted.length)}
        </>
    )
}

export const SearchBox = ({ id, label, value, onChange, options, inactiveLabel, onSelect }) => {
    const inputRef = useRef(null)
    const [open, setOpen] = useState(false)

    // La sugerencia marcada con las flechas; -1 si no hay ninguna.
    const [activeIndex, setActiveIndex] = useState(-1)

    const wanted = fold(value.trim())

    // Primero lo que coincide en el nombre; después, lo que solo coincide
    // en la descripción.
    const matches = wanted ? options.filter((option) => matchesSearch(value, option.name, option.description)) : []
    const ordered = [
        ...matches.filter((option) => fold(option.name).includes(wanted)),
        ...matches.filter((option) => !fold(option.name).includes(wanted)),
    ]
    const suggestions = ordered.slice(0, MAX_SUGGESTIONS)

    const showList = open && wanted !== ""
    const listId = `${id}-list`
    const optionId = (index) => `${id}-option-${index}`

    const close = () => {
        setOpen(false)
        setActiveIndex(-1)
    }

    const handleChange = (event) => {
        onChange(event.target.value)
        setOpen(event.target.value.trim() !== "")
        setActiveIndex(-1)
    }

    const choose = (option) => {
        onSelect(option)
        close()
    }

    const clear = () => {
        onChange("")
        close()
        inputRef.current?.focus()
    }

    const handleKeyDown = (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            if (suggestions.length === 0) return

            // Sin esto, las flechas moverían el cursor dentro del texto.
            event.preventDefault()

            const last = suggestions.length - 1
            const down = event.key === "ArrowDown"

            setOpen(true)
            setActiveIndex((current) => (down ? (current >= last ? 0 : current + 1) : current <= 0 ? last : current - 1))
        } else if (event.key === "Enter") {
            event.preventDefault()

            if (showList && suggestions[activeIndex]) {
                choose(suggestions[activeIndex])
            } else {
                close()
            }
        } else if (event.key === "Escape") {
            if (showList) {
                close()
            } else if (value) {
                onChange("")
            }
        }
    }

    return (
        <div className="cf-dash-search">
            <label htmlFor={id} className="sr-only">
                {label}
            </label>
            <i className="fa-solid fa-magnifying-glass cf-dash-search__icon" aria-hidden="true" />

            {/* role="combobox" + aria-activedescendant: el foco se queda en el
                input y el lector de pantalla anuncia la sugerencia marcada. */}
            <input
                ref={inputRef}
                id={id}
                type="text"
                role="combobox"
                className="cf-dash-search__input"
                placeholder={label}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                    if (wanted) setOpen(true)
                }}
                onBlur={close}
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls={listId}
                aria-expanded={showList}
                aria-activedescendant={showList && activeIndex >= 0 ? optionId(activeIndex) : undefined}
            />

            {value && (
                <button type="button" className="cf-dash-search__clear" onClick={clear} aria-label="Borrar búsqueda">
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
            )}

            {showList && (
                <ul id={listId} role="listbox" className="cf-dash-search__list" aria-label={label}>
                    {suggestions.map((option, index) => {
                        // Se resalta donde coincide: en el nombre o, si no, en la línea gris.
                        const inName = fold(option.name).includes(wanted)

                        return (
                            <li
                                key={option.id}
                                id={optionId(index)}
                                role="option"
                                aria-selected={index === activeIndex}
                                className="cf-dash-search__option"
                                // onMouseDown y no onClick: se elige antes de que el
                                // input pierda el foco y cierre la lista.
                                onMouseDown={(event) => {
                                    event.preventDefault()
                                    choose(option)
                                }}
                            >
                                <span className="cf-dash-search__name">
                                    <Highlight text={option.name} query={inName ? value : ""} />
                                </span>
                                {option.meta && (
                                    <span className="cf-dash-search__meta">
                                        <Highlight text={option.meta} query={inName ? "" : value} />
                                    </span>
                                )}
                                {!option.active && <span className="cf-dash-search__state">{inactiveLabel}</span>}
                            </li>
                        )
                    })}

                    {ordered.length > MAX_SUGGESTIONS && (
                        <li className="cf-dash-search__more" role="presentation">
                            Y {ordered.length - MAX_SUGGESTIONS} más en la lista
                        </li>
                    )}

                    {ordered.length === 0 && (
                        <li className="cf-dash-search__more cf-dash-search__more--empty" role="presentation">
                            Ningún resultado
                        </li>
                    )}
                </ul>
            )}
        </div>
    )
}
