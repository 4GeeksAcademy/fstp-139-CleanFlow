/**
 * AJUSTES · SEGURIDAD (#13).
 *
 * Cambiar la contraseña, para cualquier rol. Se pide la actual: con una
 * sesión abierta en un ordenador ajeno, nadie puede cambiarla sin saberla.
 *
 * La sesión NO se corta al cambiarla: el token sigue siendo válido.
 *
 * API: services/accountService.js
 *
 * Sin estilos todavía: se visten en el paso 13 de la #13.
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
        setSaved(true)
    }

    return (
        <div>
            <h2>Seguridad</h2>
            <p>Cambia tu contraseña. Tendrás que usar la nueva la próxima vez que entres.</p>

            {/* noValidate: los avisos los damos nosotros, en español.
                autoComplete: así el gestor de contraseñas sabe cuál es cuál. */}
            <form onSubmit={handleSubmit} noValidate>
                <div>
                    <label htmlFor="current_password">Contraseña actual</label>
                    <input
                        id="current_password"
                        name="current_password"
                        type="password"
                        autoComplete="current-password"
                        value={form.current_password}
                        onChange={handleChange}
                        aria-invalid={Boolean(errors.current_password)}
                        aria-describedby={errors.current_password ? "current_password-error" : undefined}
                    />
                    {errors.current_password && <p id="current_password-error">{errors.current_password}</p>}
                </div>

                <div>
                    <label htmlFor="new_password">Contraseña nueva</label>
                    <input
                        id="new_password"
                        name="new_password"
                        type="password"
                        autoComplete="new-password"
                        value={form.new_password}
                        onChange={handleChange}
                        aria-invalid={Boolean(errors.new_password)}
                        aria-describedby={errors.new_password ? "new_password-error" : "new_password-hint"}
                    />
                    {errors.new_password ? (
                        <p id="new_password-error">{errors.new_password}</p>
                    ) : (
                        <p id="new_password-hint">Mínimo {PASSWORD_MIN_LENGTH} caracteres.</p>
                    )}
                </div>

                <div>
                    <label htmlFor="repeat_password">Repite la contraseña nueva</label>
                    <input
                        id="repeat_password"
                        name="repeat_password"
                        type="password"
                        autoComplete="new-password"
                        value={form.repeat_password}
                        onChange={handleChange}
                        aria-invalid={Boolean(errors.repeat_password)}
                        aria-describedby={errors.repeat_password ? "repeat_password-error" : undefined}
                    />
                    {errors.repeat_password && <p id="repeat_password-error">{errors.repeat_password}</p>}
                </div>

                {saveError && <p role="alert">{saveError}</p>}
                {saved && <p role="status">Contraseña actualizada</p>}

                <button type="submit" disabled={saving}>
                    {saving ? "Guardando..." : "Cambiar contraseña"}
                </button>
            </form>
        </div>
    )
}