/**
 * FORMULARIO DE DIRECCIÓN (#13).
 *
 * Crea una dirección o, si recibe `address`, la edita. Valida con las
 * mismas reglas y textos que validate_address() en routes.py.
 *
 * NO llama a la API: entrega los datos limpios a `onSubmit`. Así lo podrá
 * reutilizar el panel de contratación (#14) para crear una dirección sin
 * salir de la reserva, igual que hace ServiceForm.jsx con los servicios.
 *
 * Estilos: dashboard.css (cf-dash-*, cf-account__*).
 */

import { useState } from "react"

// Mismos topes que las columnas de Address en models.py.
const STREET_MAX_LENGTH = 150
const NUMBER_MAX_LENGTH = 20
const FLOOR_MAX_LENGTH = 20
const CITY_MAX_LENGTH = 80

// Código postal español: cinco números.
const POSTAL_CODE_PATTERN = /^[0-9]{5}$/

// Todo en texto, que es lo que dan los inputs.
const EMPTY_FORM = {
    street: "",
    number: "",
    floor: "",
    postal_code: "",
    city: "",
    access_notes: "",
}

/** Los datos de una dirección, listos para el formulario. */
const formFrom = (address) => ({
    street: address.street,
    number: address.number,
    // Los opcionales llegan como null cuando están vacíos.
    floor: address.floor || "",
    postal_code: address.postal_code,
    city: address.city,
    access_notes: address.access_notes || "",
})

/** Mismos mensajes que routes.py: el usuario lee siempre lo mismo. */
const validate = (form) => {
    const errors = {}

    if (!form.street.trim()) errors.street = "La calle es obligatoria"
    else if (form.street.trim().length > STREET_MAX_LENGTH)
        errors.street = `La calle no puede superar los ${STREET_MAX_LENGTH} caracteres`

    if (!form.number.trim()) errors.number = "El número es obligatorio"
    else if (form.number.trim().length > NUMBER_MAX_LENGTH)
        errors.number = `El número no puede superar los ${NUMBER_MAX_LENGTH} caracteres`

    if (form.floor.trim().length > FLOOR_MAX_LENGTH)
        errors.floor = `El piso no puede superar los ${FLOOR_MAX_LENGTH} caracteres`

    if (!POSTAL_CODE_PATTERN.test(form.postal_code.trim()))
        errors.postal_code = "El código postal tiene que ser cinco números"

    if (!form.city.trim()) errors.city = "La ciudad es obligatoria"
    else if (form.city.trim().length > CITY_MAX_LENGTH)
        errors.city = `La ciudad no puede superar los ${CITY_MAX_LENGTH} caracteres`

    return errors
}

export const AddressForm = ({ address, saving, apiError, onSubmit, onCancel }) => {
    const [form, setForm] = useState(address ? formFrom(address) : EMPTY_FORM)
    const [errors, setErrors] = useState({})

    const handleChange = (event) => {
        const { name, value } = event.target

        setForm((current) => ({ ...current, [name]: value }))
        setErrors((current) => ({ ...current, [name]: undefined }))
    }

    const handleSubmit = (event) => {
        event.preventDefault()

        const found = validate(form)
        setErrors(found)

        if (Object.keys(found).length > 0) return

        // Se entregan ya recortados: el backend guarda los opcionales vacíos
        // como NULL, así "sin piso" tiene una sola forma.
        onSubmit({
            street: form.street.trim(),
            number: form.number.trim(),
            floor: form.floor.trim(),
            postal_code: form.postal_code.trim(),
            city: form.city.trim(),
            access_notes: form.access_notes.trim(),
        })
    }

    // Un campo y su error, que se repiten cinco veces. `full` lo pone a
    // todo el ancho del formulario, que va a dos columnas.
    const field = (name, label, { full = false, ...extra } = {}) => (
        <div className={"cf-dash-field" + (full ? " cf-account__full" : "")}>
            <label className="cf-dash-field__label" htmlFor={name}>
                {label}
            </label>
            <input
                className="cf-dash-input"
                id={name}
                name={name}
                type="text"
                value={form[name]}
                onChange={handleChange}
                aria-invalid={Boolean(errors[name])}
                aria-describedby={errors[name] ? `${name}-error` : undefined}
                {...extra}
            />
            {errors[name] && (
                <p className="cf-dash-field__error" id={`${name}-error`}>
                    {errors[name]}
                </p>
            )}
        </div>
    )

    return (
        <>
            <h2 className="cf-account__subtitle">{address ? "Editar dirección" : "Nueva dirección"}</h2>

            <form className="cf-account__grid" onSubmit={handleSubmit} noValidate>
                {field("street", "Calle", { full: true, maxLength: STREET_MAX_LENGTH, autoFocus: true })}
                {field("number", "Número", { maxLength: NUMBER_MAX_LENGTH })}
                {field("floor", "Piso (opcional)", { maxLength: FLOOR_MAX_LENGTH })}
                {/* inputMode numeric: en el móvil sale el teclado de números. */}
                {field("postal_code", "Código postal", { maxLength: 5, inputMode: "numeric" })}
                {field("city", "Ciudad", { maxLength: CITY_MAX_LENGTH })}

                <div className="cf-dash-field cf-account__full">
                    <label className="cf-dash-field__label" htmlFor="access_notes">
                        Notas de acceso (opcional)
                    </label>
                    <textarea
                        className="cf-dash-input"
                        id="access_notes"
                        name="access_notes"
                        rows="3"
                        value={form.access_notes}
                        onChange={handleChange}
                    />
                    <p className="cf-dash-field__note">
                        Portero, timbre, dónde aparcar, a qué hora hay alguien en casa...
                    </p>
                </div>

                <div className="cf-account__actions cf-account__full">
                    {/* Errores de la API (por ejemplo, un 400 que aquí no cazamos). */}
                    {apiError && (
                        <p className="cf-dash-alert" role="alert">
                            {apiError}
                        </p>
                    )}

                    <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={onCancel} disabled={saving}>
                        Cancelar
                    </button>
                    <button type="submit" className="cf-dash-btn" disabled={saving}>
                        {saving ? "Guardando..." : address ? "Guardar cambios" : "Añadir dirección"}
                    </button>
                </div>
            </form>
        </>
    )
}
