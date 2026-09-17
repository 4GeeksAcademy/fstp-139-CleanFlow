/**
 * AJUSTES · SEGURIDAD (#13).
 *
 * Cambiar la contraseña, para cualquier rol. Se pide la actual: con una
 * sesión abierta en un ordenador ajeno, nadie puede cambiarla sin saberla.
 *
 * La sesión NO se corta al cambiarla: el token sigue siendo válido.
 *
 * API: services/accountService.js · Estilos: dashboard.css (cf-dash-*, cf-account__*).
 */

import { useState } from "react"
import useGlobalReducer from "../../../hooks/useGlobalReducer"
import { changePassword } from "../../../services/accountService"

// El mismo mínimo que pide el backend en /register y en /account/password.
const PASSWORD_MIN_LENGTH = 6

const EMPTY_FORM = { current_password: "", new_password: "", repeat_password: "" }

/** Mismos mensajes que routes.py, salvo el de repetir, que es solo de aquí. */
const validate = (form) => {
    const errors = {}

    if (!form.current_password) errors.current_password = "La contraseña actual es obligatoria"

    if (!form.new_password) errors.new_password = "La contraseña nueva es obligatoria"
    else if (form.new_password.length < PASSWORD_MIN_LENGTH)
        errors.new_password = `La contraseña nueva debe tener mínimo ${PASSWORD_MIN_LENGTH} caracteres`
    else if (form.new_password === form.current_password)
        errors.new_password = "La contraseña nueva tiene que ser distinta de la actual"

    // Repetirla no viaja al backend: es solo para cazar erratas al escribir.
    if (form.new_password && form.repeat_password !== form.new_password)
        errors.repeat_password = "Las dos contraseñas nuevas no coinciden"

    return errors
}

export const AccountSecurity = () => {
    const { store, dispatch } = useGlobalReducer()

    const [form, setForm] = useState(EMPTY_FORM)
    const [errors, setErrors] = useState({})
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState("")
    const [saved, setSaved] = useState(false)

    // Qué campos se están viendo en claro. Empieza vacío y se olvida al
    // salir de la pantalla: nadie quiere volver y ver su contraseña.
    const [shown, setShown] = useState({})

    const toggleShown = (field) => setShown((current) => ({ ...current, [field]: !current[field] }))

    // Token caducado (401) o corrupto (422): se cierra la sesión y
    // ProtectedRoutes manda al login. OJO: la contraseña actual incorrecta
    // llega como 400, precisamente para no confundirse con esto.
    const sessionExpired = (result) => {
        if (result.status === 401 || result.status === 422) {
            dispatch({ type: "LOGOUT" })
            return true
        }
        return false
    }

    const handleChange = (event) => {
        const { name, value } = event.target

        setForm((current) => ({ ...current, [name]: value }))

        setSaved(false)
        setSaveError("")
        setErrors((current) => ({ ...current, [name]: undefined }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        const found = validate(form)
        setErrors(found)

        if (Object.keys(found).length > 0) return

        setSaving(true)
        setSaveError("")

        const result = await changePassword(form.current_password, form.new_password, store.token)

        if (sessionExpired(result)) return

        setSaving(false)

        if (!result.ok) {
            // El único error del backend que habla de un campo concreto es
            // el de la contraseña actual: se enseña debajo de su campo.
            if (/actual no es correcta/i.test(result.data.message)) {
                setErrors({ current_password: result.data.message })
            } else {
                setSaveError(result.data.message)
            }
            return
        }

        // Los campos se vacían: dejar una contraseña escrita en pantalla no
        // aporta nada y se queda a la vista de quien pase.
        setForm(EMPTY_FORM)
        setShown({})
        setSaved(true)
    }

    // Los tres campos son iguales: mismo marcado con el ojo dentro. Es una
    // función que devuelve JSX, no un componente: así no se vuelve a montar
    // en cada tecla y el campo no pierde el cursor.
    const passwordField = (name, label, autoComplete, hint) => {
        const visible = Boolean(shown[name])
        const error = errors[name]

        return (
            <div className="cf-dash-field">
                <label className="cf-dash-field__label" htmlFor={name}>
                    {label}
                </label>

                <div className="cf-account__password">
                    <input
                        className="cf-dash-input"
                        id={name}
                        name={name}
                        // Cambiar el type es lo único que hace el ojo: lo
                        // escrito no se toca.
                        type={visible ? "text" : "password"}
                        autoComplete={autoComplete}
                        value={form[name]}
                        onChange={handleChange}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
                    />

                    {/* aria-pressed dice si está activado; el aria-label
                        cambia, para que se entienda qué hace al pulsarlo. */}
                    <button
                        type="button"
                        className="cf-account__eye"
                        onClick={() => toggleShown(name)}
                        aria-pressed={visible}
                        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                        <i className={visible ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} aria-hidden="true" />
                    </button>
                </div>

                {error ? (
                    <p className="cf-dash-field__error" id={`${name}-error`}>
                        {error}
                    </p>
                ) : (
                    hint && (
                        <p className="cf-dash-field__note" id={`${name}-hint`}>
                            {hint}
                        </p>
                    )
                )}
            </div>
        )
    }

    return (
        <div className="cf-account__card">
            <h2 className="cf-account__subtitle">Seguridad</h2>
            <p className="cf-account__lede">
                Cambia tu contraseña. Tendrás que usar la nueva la próxima vez que entres.
            </p>

            {/* noValidate: los avisos los damos nosotros, en español.
                autoComplete: así el gestor de contraseñas sabe cuál es cuál. */}
            <form className="cf-account__grid cf-account__grid--one" onSubmit={handleSubmit} noValidate>
                {passwordField("current_password", "Contraseña actual", "current-password")}
                {passwordField(
                    "new_password",
                    "Contraseña nueva",
                    "new-password",
                    `Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`
                )}
                {passwordField("repeat_password", "Repite la contraseña nueva", "new-password")}

                <div className="cf-account__actions">
                    {saveError && (
                        <p className="cf-dash-alert" role="alert">
                            {saveError}
                        </p>
                    )}
                    {saved && (
                        <p className="cf-account__saved" role="status">
                            <i className="fa-solid fa-check" aria-hidden="true" />
                            Contraseña actualizada
                        </p>
                    )}

                    <button type="submit" className="cf-dash-btn" disabled={saving}>
                        {saving ? "Guardando..." : "Cambiar contraseña"}
                    </button>
                </div>
            </form>
        </div>
    )
}
