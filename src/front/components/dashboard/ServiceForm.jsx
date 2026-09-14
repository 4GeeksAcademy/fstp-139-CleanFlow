/**
 * FORMULARIO DE SERVICIO (ENCARGADO).
 *
 * El mismo para crear y para editar: con `service` edita ese servicio;
 * sin él, crea uno nuevo. Lo usa ManageServices.jsx.
 *
 * Guarda lo que se escribe y lo valida con las mismas reglas y textos que
 * validate_service() en routes.py. No llama a la API: entrega los datos ya
 * limpios a `onSubmit`, y ManageServices los envía.
 *
 * Al lado, el panel "Así lo verá el cliente" resume el servicio mientras
 * se escribe.
 */

import { useState } from "react"

// Mismos topes que las columnas de Service en models.py.
const NAME_MAX_LENGTH = 100
const IMAGE_URL_MAX_LENGTH = 255

// Los únicos minutos que acepta la API: dividen la hora en partes enteras.
const MINUTES_OPTIONS = [10, 12, 15, 20, 30, 60]

// Orden de los campos en pantalla: al validar, el cursor va al primero
// que tenga error.
const FIELD_ORDER = [
    "name",
    "description",
    "image_url",
    "base_hourly_rate",
    "minutes_per_task",
    "min_hours",
    "hour_step",
    "max_hours",
]

// Todo en texto, que es lo que dan los campos. Se convierte al enviar.
const EMPTY_FORM = {
    name: "",
    description: "",
    long_description: "",
    image_url: "",
    base_hourly_rate: "",
    no_tasks: false,
    minutes_per_task: "",
    min_hours: "1",
    hour_step: "1",
    max_hours: "",
}

// ----------------------------------------------------------------------
// FORMATO — también los usa la lista de ManageServices.jsx
// ----------------------------------------------------------------------

const priceFormat = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
})

/** 40 -> "40 €" · 42.5 -> "42,5 €" */
export const formatPrice = (value) => priceFormat.format(value)

export const taskWord = (count) => (count === 1 ? "tarea" : "tareas")

/**
 * Las horas que podrá elegir el cliente, en texto:
 *   "1, 2, 3, 4… horas" · "6, 9, 12, 15… horas" · "1, 2, 3… hasta 8 horas" · "2, 4, 6 horas"
 */
export const hoursText = (min, step, max) => {
    const values = []
    let hours = min

    while ((max === null || hours <= max) && values.length < 5) {
        values.push(hours)
        hours += step
    }

    const hasMore = max === null || hours <= max

    if (!hasMore) return `${values.join(", ")} ${values.length === 1 && values[0] === 1 ? "hora" : "horas"}`
    if (max === null) return `${values.slice(0, 4).join(", ")}… horas`
    return `${values.slice(0, 3).join(", ")}… hasta ${max} horas`
}

// ----------------------------------------------------------------------
// LECTURA Y VALIDACIÓN
// ----------------------------------------------------------------------

// "6" -> 6. Cualquier otra cosa (vacío, 2.5, -1, "abc") -> null.
const toWholeNumber = (text) => (/^\d+$/.test(String(text).trim()) ? Number(text) : null)

// Acepta coma o punto: "42,5" -> 42.5. Si no es un número mayor que cero -> null.
const toPrice = (text) => {
    const clean = String(text).trim().replace(",", ".")
    const value = Number(clean)
    return clean !== "" && Number.isFinite(value) && value > 0 ? value : null
}

// Igual que slugify() del backend: sin letras ni números no hay URL posible.
const hasLetterOrNumber = (text) => /[a-z0-9]/i.test(text.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""))

// El servicio de la API, en el formato de los campos.
const formFromService = (service) => ({
    name: service.name,
    description: service.description,
    long_description: service.long_description || "",
    image_url: service.image_url || "",
    base_hourly_rate: String(service.base_hourly_rate).replace(".", ","),
    no_tasks: service.minutes_per_task === null,
    minutes_per_task: service.minutes_per_task ? String(service.minutes_per_task) : "",
    min_hours: String(service.min_hours),
    hour_step: String(service.hour_step),
    max_hours: service.max_hours ? String(service.max_hours) : "",
})

// Devuelve { campo: mensaje } con los errores; vacío si todo vale.
const validate = (form) => {
    const errors = {}
    const name = form.name.trim()

    if (!name) errors.name = "El nombre del servicio es obligatorio"
    else if (name.length > NAME_MAX_LENGTH) errors.name = `El nombre no puede superar los ${NAME_MAX_LENGTH} caracteres`
    else if (!hasLetterOrNumber(name)) errors.name = "El nombre tiene que contener al menos una letra o un número"

    if (!form.description.trim()) errors.description = "La descripción es obligatoria"

    if (form.image_url.trim().length > IMAGE_URL_MAX_LENGTH) {
        errors.image_url = `La URL de la imagen no puede superar los ${IMAGE_URL_MAX_LENGTH} caracteres`
    }

    if (toPrice(form.base_hourly_rate) === null) {
        errors.base_hourly_rate = "El precio por hora tiene que ser un número mayor que cero"
    }

    // Esta regla solo existe aquí: a la API le vale un null, pero significa
    // "no lleva tareas". Así no se guarda sin tareas por olvido.
    if (!form.no_tasks && !form.minutes_per_task) {
        errors.minutes_per_task = "Elige cuántos minutos dura una tarea, o marca que el servicio no lleva tareas"
    }

    const minHours = toWholeNumber(form.min_hours)
    if (minHours === null || minHours < 1) errors.min_hours = "El mínimo de horas tiene que ser un número entero, 1 o más"

    const hourStep = toWholeNumber(form.hour_step)
    if (hourStep === null || hourStep < 1) errors.hour_step = "El salto de horas tiene que ser un número entero, 1 o más"

    if (form.max_hours.trim() !== "") {
        const maxHours = toWholeNumber(form.max_hours)
        if (maxHours === null || (minHours !== null && maxHours < minHours)) {
            errors.max_hours = "El máximo de horas tiene que ser un número entero, igual o mayor que el mínimo"
        }
    }

    return errors
}

// Los campos, ya convertidos a lo que espera la API.
const buildPayload = (form) => ({
    name: form.name.trim(),
    description: form.description.trim(),
    long_description: form.long_description.trim() || null,
    image_url: form.image_url.trim() || null,
    base_hourly_rate: toPrice(form.base_hourly_rate),
    minutes_per_task: form.no_tasks ? null : Number(form.minutes_per_task),
    min_hours: toWholeNumber(form.min_hours),
    hour_step: toWholeNumber(form.hour_step),
    max_hours: form.max_hours.trim() === "" ? null : toWholeNumber(form.max_hours),
})

// ----------------------------------------------------------------------
// COMPONENTE
// ----------------------------------------------------------------------

export const ServiceForm = ({ service, saving, apiError, onSubmit, onCancel }) => {
    const [form, setForm] = useState(() => (service ? formFromService(service) : EMPTY_FORM))

    // Los errores se calculan al pulsar guardar. Al tocar un campo, se quita
    // el suyo: no tiene sentido seguir en rojo lo que ya se está corrigiendo.
    const [errors, setErrors] = useState({})

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target
        setForm({ ...form, [name]: type === "checkbox" ? checked : value })

        // Marcar "no lleva tareas" también resuelve el error de los minutos.
        const fixedField = name === "no_tasks" ? "minutes_per_task" : name

        if (errors[fixedField]) {
            const remaining = { ...errors }
            delete remaining[fixedField]
            setErrors(remaining)
        }
    }

    const handleSubmit = (event) => {
        event.preventDefault()

        if (saving) return

        const found = validate(form)
        setErrors(found)

        const firstField = FIELD_ORDER.find((field) => found[field])

        if (firstField) {
            // Los minutos no son un campo sino seis pastillas: el cursor va a la primera.
            const target = firstField === "minutes_per_task" ? `minutes-${MINUTES_OPTIONS[0]}` : firstField
            document.getElementById(target)?.focus()
            return
        }

        onSubmit(buildPayload(form))
    }

    // Mensaje bajo el campo y los atributos que lo conectan con él.
    const fieldError = (field) =>
        errors[field] && (
            <p className="cf-dash-field__error" id={`${field}-error`}>
                {errors[field]}
            </p>
        )

    const invalidProps = (field) =>
        errors[field] ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {}

    // ---- Lo que se calcula mientras se escribe ----
    const price = toPrice(form.base_hourly_rate)
    const minHours = toWholeNumber(form.min_hours)
    const hourStep = toWholeNumber(form.hour_step)
    const maxHours = form.max_hours.trim() === "" ? null : toWholeNumber(form.max_hours)
    const hoursValid =
        Boolean(minHours && hourStep) && !(form.max_hours.trim() !== "" && (maxHours === null || maxHours < minHours))

    // null: no lleva tareas · número: minutos elegidos · undefined: aún sin elegir
    const minutes = form.no_tasks ? null : form.minutes_per_task ? Number(form.minutes_per_task) : undefined
    const perHour = minutes ? 60 / minutes : null

    const minutesNote =
        minutes === null
            ? "El cliente contrata horas, sin elegir tareas."
            : minutes === undefined
                ? "Cuánto dura una tarea en este servicio."
                : `= ${perHour} ${taskWord(perHour)} por hora.`

    return (
        <div className="cf-services__editor">
            <form className="cf-services__form" onSubmit={handleSubmit} noValidate>
                <h2 className="cf-services__form-title">{service ? "Editar servicio" : "Nuevo servicio"}</h2>

                {/* Errores de la API: el 409 del nombre repetido, por ejemplo. */}
                {apiError && (
                    <p className="cf-dash-alert" role="alert">
                        {apiError}
                    </p>
                )}

                {/* ---- DATOS ---- */}
                <fieldset className="cf-services__section">
                    <legend className="cf-services__legend">Datos del servicio</legend>

                    <div className="cf-dash-field">
                        <label htmlFor="name" className="cf-dash-field__label">
                            Nombre
                        </label>
                        <input
                            id="name"
                            name="name"
                            className="cf-dash-input"
                            value={form.name}
                            onChange={handleChange}
                            maxLength={NAME_MAX_LENGTH}
                            placeholder="Por ejemplo: Limpieza de cristales"
                            autoFocus
                            {...invalidProps("name")}
                        />
                        {fieldError("name")}
                        <span className="cf-dash-field__hint">
                            {form.name.length}/{NAME_MAX_LENGTH}
                        </span>

                        {/* El slug no se edita: la API no lo regenera al renombrar. */}
                        {service && (
                            <p className="cf-services__slug">
                                Dirección en la web: <code>{service.slug}</code> No cambia al renombrar, para no
                                romper enlaces.
                            </p>
                        )}
                    </div>

                    <div className="cf-dash-field">
                        <label htmlFor="description" className="cf-dash-field__label">
                            Descripción corta
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            className="cf-dash-input"
                            rows={2}
                            value={form.description}
                            onChange={handleChange}
                            placeholder="Una frase para las tarjetas y el listado"
                            {...invalidProps("description")}
                        />
                        {fieldError("description")}
                    </div>

                    <div className="cf-dash-field">
                        <label htmlFor="long_description" className="cf-dash-field__label">
                            Descripción larga <span className="cf-dash-field__optional">(opcional)</span>
                        </label>
                        <textarea
                            id="long_description"
                            name="long_description"
                            className="cf-dash-input"
                            rows={3}
                            value={form.long_description}
                            onChange={handleChange}
                            placeholder="Qué incluye, para quién es..."
                        />
                        <p className="cf-dash-field__note">Para la ficha del servicio. Si la dejas vacía, se usa la corta.</p>
                    </div>

                    <div className="cf-dash-field">
                        <label htmlFor="image_url" className="cf-dash-field__label">
                            URL de la imagen <span className="cf-dash-field__optional">(opcional)</span>
                        </label>
                        <input
                            id="image_url"
                            name="image_url"
                            type="url"
                            className="cf-dash-input"
                            value={form.image_url}
                            onChange={handleChange}
                            maxLength={IMAGE_URL_MAX_LENGTH}
                            placeholder="https://..."
                            {...invalidProps("image_url")}
                        />
                        {fieldError("image_url")}
                    </div>
                </fieldset>

                {/* ---- PRECIO ---- */}
                <fieldset className="cf-services__section">
                    <legend className="cf-services__legend">Precio</legend>

                    <div className="cf-services__grid-2">
                        <div className="cf-dash-field">
                            <label htmlFor="base_hourly_rate" className="cf-dash-field__label">
                                Precio por hora
                            </label>
                            {/* Texto y no type="number": así se puede escribir con coma. */}
                            <div className="cf-dash-affix">
                                <input
                                    id="base_hourly_rate"
                                    name="base_hourly_rate"
                                    inputMode="decimal"
                                    className="cf-dash-input"
                                    value={form.base_hourly_rate}
                                    onChange={handleChange}
                                    placeholder="40"
                                    {...invalidProps("base_hourly_rate")}
                                />
                                <span className="cf-dash-affix__text">€/h</span>
                            </div>
                            {fieldError("base_hourly_rate")}
                        </div>
                    </div>
                </fieldset>

                {/* ---- TAREAS ---- */}
                <fieldset className="cf-services__section">
                    <legend className="cf-services__legend">Tareas</legend>

                    <label className="cf-dash-check">
                        <input type="checkbox" id="no_tasks" name="no_tasks" checked={form.no_tasks} onChange={handleChange} />
                        <span className="cf-dash-check__text">
                            <strong>Este servicio no lleva tareas</strong>
                            <span>Se contratan solo horas, como en fin de obra.</span>
                        </span>
                    </label>

                    {/* Marcar "no lleva tareas" apaga las pastillas: es el null
                        de minutes_per_task. Al desmarcar, vuelve lo elegido. */}
                    <div
                        className="cf-dash-field"
                        role="radiogroup"
                        aria-labelledby="minutes-label"
                        {...(errors.minutes_per_task ? { "aria-describedby": "minutes_per_task-error" } : {})}
                    >
                        <span id="minutes-label" className="cf-dash-field__label">
                            Minutos por tarea
                        </span>
                        <div className={`cf-dash-chips${errors.minutes_per_task ? " cf-dash-chips--invalid" : ""}`}>
                            {MINUTES_OPTIONS.map((option) => (
                                <label className="cf-dash-chip" key={option}>
                                    <input
                                        type="radio"
                                        id={`minutes-${option}`}
                                        name="minutes_per_task"
                                        value={option}
                                        checked={!form.no_tasks && form.minutes_per_task === String(option)}
                                        onChange={handleChange}
                                        disabled={form.no_tasks}
                                    />
                                    <span>{option} min</span>
                                </label>
                            ))}
                        </div>
                        {fieldError("minutes_per_task")}
                        <p className="cf-dash-field__note">{minutesNote}</p>
                    </div>
                </fieldset>

                {/* ---- HORAS ---- */}
                <fieldset className="cf-services__section">
                    <legend className="cf-services__legend">Horas contratables</legend>

                    <div className="cf-services__grid-3">
                        <div className="cf-dash-field">
                            <label htmlFor="min_hours" className="cf-dash-field__label">
                                Mínimo
                            </label>
                            <input
                                id="min_hours"
                                name="min_hours"
                                type="number"
                                min="1"
                                step="1"
                                inputMode="numeric"
                                className="cf-dash-input"
                                value={form.min_hours}
                                onChange={handleChange}
                                {...invalidProps("min_hours")}
                            />
                            {fieldError("min_hours")}
                        </div>

                        <div className="cf-dash-field">
                            <label htmlFor="hour_step" className="cf-dash-field__label">
                                De cuántas en cuántas
                            </label>
                            <input
                                id="hour_step"
                                name="hour_step"
                                type="number"
                                min="1"
                                step="1"
                                inputMode="numeric"
                                className="cf-dash-input"
                                value={form.hour_step}
                                onChange={handleChange}
                                {...invalidProps("hour_step")}
                            />
                            {fieldError("hour_step")}
                        </div>

                        <div className="cf-dash-field">
                            <label htmlFor="max_hours" className="cf-dash-field__label">
                                Máximo <span className="cf-dash-field__optional">(opcional)</span>
                            </label>
                            <input
                                id="max_hours"
                                name="max_hours"
                                type="number"
                                min="1"
                                step="1"
                                inputMode="numeric"
                                className="cf-dash-input"
                                value={form.max_hours}
                                onChange={handleChange}
                                placeholder="Sin tope"
                                {...invalidProps("max_hours")}
                            />
                            {fieldError("max_hours")}
                        </div>
                    </div>

                    <p className="cf-dash-field__note">
                        {hoursValid && `El cliente podrá elegir: ${hoursText(minHours, hourStep, maxHours)}.`}
                    </p>
                </fieldset>

                <div className="cf-services__form-actions">
                    <button type="submit" className="cf-dash-btn" disabled={saving}>
                        {saving ? "Guardando..." : service ? "Guardar cambios" : "Crear servicio"}
                    </button>
                    <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={onCancel} disabled={saving}>
                        Cancelar
                    </button>
                </div>
            </form>

            {/* ---- ASÍ LO VERÁ EL CLIENTE ----
                aria-live: un lector de pantalla anuncia los cambios del resumen. */}
            <aside className="cf-services__preview" aria-live="polite">
                <p className="cf-services__preview-label">Así lo verá el cliente</p>

                <div>
                    <p className="cf-services__preview-name">{form.name.trim() || "Nombre del servicio"}</p>
                    <p className="cf-services__preview-desc">{form.description.trim() || "La descripción corta sale aquí."}</p>
                </div>

                <dl>
                    <div>
                        <dt>Precio</dt>
                        <dd>{price ? `${formatPrice(price)} / hora` : "—"}</dd>
                    </div>
                    <div>
                        <dt>Tareas</dt>
                        <dd>
                            {minutes === null
                                ? "No lleva tareas"
                                : minutes === undefined
                                    ? "—"
                                    : `${perHour} ${taskWord(perHour)} por hora`}
                        </dd>
                    </div>
                    <div>
                        <dt>Horas</dt>
                        <dd>{hoursValid ? hoursText(minHours, hourStep, maxHours) : "—"}</dd>
                    </div>
                </dl>

                {price && hoursValid && (
                    <div className="cf-services__preview-total">
                        <span>Reserva mínima</span>
                        <strong>Desde {formatPrice(price * minHours)}</strong>
                        <span>
                            {minHours} h
                            {perHour && ` · caben ${perHour * minHours} ${taskWord(perHour * minHours)}`}
                        </span>
                    </div>
                )}
            </aside>
        </div>
    )
}
