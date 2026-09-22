/**
 * FORMULARIO DE AUSENCIA: NUEVA O EDITAR (#75).
 *
 * Se abre encima de la lista al pulsar "Añadir ausencia" o "Editar".
 * No llama a la API: entrega los datos con onSubmit y la página guarda.
 *
 *   absence:  la ausencia a editar, o null si es nueva
 *   saving:   true mientras se guarda (bloquea el formulario)
 *   error:    el mensaje de la API, si lo hay
 *
 * Estilos: dashboard.css (cf-absences__form*, cf-dash-field, cf-dash-chips).
 */

import { useState } from "react"
import { REASONS } from "./AbsenceRow"

// El mismo tope que la columna notes del backend.
const MAX_NOTES = 2000

const toForm = (absence) => ({
    starts_on: absence?.starts_on || "",
    ends_on: absence?.ends_on || "",
    reason: absence?.reason || "vacaciones",
    notes: absence?.notes || "",
})

export const AbsenceForm = ({ absence, saving, error, onSubmit, onClose }) => {
    const [form, setForm] = useState(() => toForm(absence))
    const [dateError, setDateError] = useState("")

    const change = (field) => (event) => setForm({ ...form, [field]: event.target.value })

    const submit = (event) => {
        event.preventDefault()

        // El navegador ya exige "Desde"; esto es lo que no puede comprobar él.
        if (form.ends_on && form.ends_on < form.starts_on) {
            setDateError("«Hasta» no puede ser anterior a «Desde».")
            return
        }

        setDateError("")
        // "Hasta" vacío = aún no se sabe cuándo vuelve: la API espera null.
        onSubmit({ ...form, ends_on: form.ends_on || null })
    }

    const shownError = dateError || error

    return (
        <form className="cf-absences__form" onSubmit={submit} aria-labelledby="absence-form-title">
            <div className="cf-absences__form-head">
                <h2 className="cf-absences__form-title" id="absence-form-title">
                    {absence ? "Editar ausencia" : "Nueva ausencia"}
                </h2>
                <button type="button" className="cf-absences__close" onClick={onClose} aria-label="Cerrar el formulario">
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
            </div>

            {/* fieldset solo para bloquearlo todo de una vez mientras se guarda. */}
            <fieldset disabled={saving}>
                <div className="cf-absences__grid">
                    <div className="cf-dash-field">
                        <label className="cf-dash-field__label" htmlFor="absence-start">
                            Desde
                        </label>
                        <input
                            id="absence-start"
                            className="cf-dash-input"
                            type="date"
                            required
                            value={form.starts_on}
                            onChange={change("starts_on")}
                        />
                    </div>

                    <div className="cf-dash-field">
                        <label className="cf-dash-field__label" htmlFor="absence-end">
                            Hasta <span className="cf-dash-field__optional">(vacío si aún no se sabe)</span>
                        </label>
                        <input
                            id="absence-end"
                            className="cf-dash-input"
                            type="date"
                            min={form.starts_on || undefined}
                            value={form.ends_on}
                            onChange={change("ends_on")}
                            aria-invalid={dateError ? true : undefined}
                        />
                    </div>

                    {/* Chips y no un select: son solo tres y se ven todos de golpe. */}
                    <div className="cf-dash-field cf-absences__wide">
                        <span className="cf-dash-field__label" id="absence-reason-label">
                            Motivo
                        </span>
                        <div className="cf-dash-chips" role="radiogroup" aria-labelledby="absence-reason-label">
                            {REASONS.map((reason) => (
                                <label className="cf-dash-chip" key={reason.value}>
                                    <input
                                        type="radio"
                                        name="absence-reason"
                                        value={reason.value}
                                        checked={form.reason === reason.value}
                                        onChange={change("reason")}
                                    />
                                    <span>{reason.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="cf-dash-field cf-absences__wide">
                        <label className="cf-dash-field__label" htmlFor="absence-notes">
                            Notas internas <span className="cf-dash-field__optional">(opcional)</span>
                        </label>
                        <textarea
                            id="absence-notes"
                            className="cf-dash-input"
                            rows={2}
                            maxLength={MAX_NOTES}
                            placeholder="Solo las ve el encargado, nunca el cliente"
                            value={form.notes}
                            onChange={change("notes")}
                        />
                        <span className="cf-dash-field__hint">
                            {form.notes.length} / {MAX_NOTES}
                        </span>
                    </div>

                    {shownError && (
                        <p className="cf-dash-alert cf-absences__wide" role="alert">
                            {shownError}
                        </p>
                    )}
                </div>

                <div className="cf-absences__actions">
                    <button type="submit" className="cf-dash-btn">
                        {saving ? "Guardando..." : "Guardar ausencia"}
                    </button>
                    <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={onClose}>
                        Cancelar
                    </button>
                </div>
            </fieldset>
        </form>
    )
}
