/**
 * AJUSTES · SEGURIDAD (#13).
 *
 * Cambiar la contraseña, para cualquier rol. Se pide la actual: con una
 * sesión abierta en un ordenador ajeno, nadie puede cambiarla sin saberla.
 *
 * Quien entró con Google todavía no tiene ninguna, así que a ese se le
 * ofrece CREARLA y no cambiarla: no hay anterior que pedir. Arriba se
 * ven las dos formas de entrar y cuáles tiene puestas, y al que le falte
 * Google se le ofrece conectarlo.
 *
 * Todo lo de Google es SOLO del cliente. El trabajador y el encargado
 * entran por el área de empleados, que no ofrece ese botón, así que a
 * ellos esta pantalla solo les habla de la contraseña. Quien lo impide
 * de verdad es el backend (@role_required en /account/google): esconderlo
 * aquí es para no ofrecer algo que iba a acabar en un 403.
 *
 * Y tiene que ser el Google del MISMO correo de la cuenta. El correo se
 * dice antes de pulsar, no solo al fallar: con varias sesiones de Google
 * abiertas, elegir a ciegas acaba en error casi siempre.
 *
 * Hasta saber cuáles tiene no se pinta nada de eso: enseñar el
 * formulario equivocado hace que escriba tres campos para nada.
 *
 * La sesión NO se corta al cambiarla: el token sigue siendo válido.
 *
 * API: services/accountService.js · Estilos: dashboard.css (cf-dash-*, cf-account__*).
 */

import { useEffect, useState } from "react"
import useGlobalReducer from "../../../hooks/useGlobalReducer"
import { getAccount, changePassword, createPassword, connectGoogle } from "../../../services/accountService"
import { GoogleButton } from "../../../components/web/GoogleButton"

// El mismo mínimo que pide el backend en /register y en /account/password.
const PASSWORD_MIN_LENGTH = 6

const EMPTY_FORM = { current_password: "", new_password: "", repeat_password: "" }

/** Mismos mensajes que routes.py, salvo el de repetir, que es solo de aquí. */
const validate = (form, hasPassword) => {
    const errors = {}

    // Sin contraseña anterior no hay nada que pedir ni con qué comparar.
    if (hasPassword && !form.current_password)
        errors.current_password = "La contraseña actual es obligatoria"

    if (!form.new_password) errors.new_password = "La contraseña nueva es obligatoria"
    else if (form.new_password.length < PASSWORD_MIN_LENGTH)
        errors.new_password = `La contraseña nueva debe tener mínimo ${PASSWORD_MIN_LENGTH} caracteres`
    else if (hasPassword && form.new_password === form.current_password)
        errors.new_password = "La contraseña nueva tiene que ser distinta de la actual"

    // Repetirla no viaja al backend: es solo para cazar erratas al escribir.
    if (form.new_password && form.repeat_password !== form.new_password)
        errors.repeat_password = "Las dos contraseñas nuevas no coinciden"

    return errors
}

export const AccountSecurity = () => {
    const { store, dispatch } = useGlobalReducer()

    // Google es solo del cliente: el empleado entra por el área de
    // empleados, que no ofrece ese botón. Mismo criterio que AccountLayout.
    const isClient = store.user?.role === "client"

    const [form, setForm] = useState(EMPTY_FORM)
    const [errors, setErrors] = useState({})
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState("")
    const [saved, setSaved] = useState(false)

    // Qué campos se están viendo en claro. Empieza vacío y se olvida al
    // salir de la pantalla: nadie quiere volver y ver su contraseña.
    const [shown, setShown] = useState({})

    // Qué formas de entrar tiene puestas. null mientras se sabe: hasta
    // entonces no se pinta el formulario, porque no sabemos si es el de
    // crear o el de cambiar.
    const [keys, setKeys] = useState(null)

    // Si la consulta falla, keys se quedaría en null para siempre y la
    // pantalla enseñaría el formulario de crear a quien ya tiene
    // contraseña. Con esto se dice qué pasó y se puede reintentar.
    const [loadError, setLoadError] = useState("")
    const [retryKey, setRetryKey] = useState(0)

    // Conectar Google tiene su propio estado y su propio aviso: si
    // compartiera el del formulario, un fallo al conectar saldría debajo
    // de los campos de la contraseña, que no tienen nada que ver.
    const [linking, setLinking] = useState(false)
    const [linkError, setLinkError] = useState("")

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

    useEffect(() => {
        let alive = true

        const load = async () => {
            const result = await getAccount(store.token)

            if (!alive) return

            if (result.ok) {
                // result.data ya ES la cuenta: getAccount la desenvuelve.
                setKeys({
                    hasPassword: result.data.has_password,
                    hasGoogle: result.data.has_google,
                })
                setLoadError("")
                return
            }

            if (sessionExpired(result)) return

            setLoadError("No hemos podido comprobar cómo entras en tu cuenta.")
        }

        load()

        return () => { alive = false }
    }, [store.token, retryKey])

    const hasPassword = keys?.hasPassword

    const toggleShown = (field) => setShown((current) => ({ ...current, [field]: !current[field] }))

    const handleChange = (event) => {
        const { name, value } = event.target

        setForm((current) => ({ ...current, [name]: value }))

        setSaved(false)
        setSaveError("")
        setErrors((current) => ({ ...current, [name]: undefined }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        const found = validate(form, hasPassword)
        setErrors(found)

        if (Object.keys(found).length > 0) return

        setSaving(true)
        setSaveError("")

        // Crear y cambiar son dos endpoints distintos a propósito: el de
        // crear no puede pedir la anterior porque no existe, y por eso
        // mismo no puede servir para cambiarla.
        const result = hasPassword
            ? await changePassword(form.current_password, form.new_password, store.token)
            : await createPassword(form.new_password, store.token)

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

        // Al crearla, la pantalla pasa a ser la de cambiarla.
        if (!hasPassword) setKeys((current) => ({ ...current, hasPassword: true }))
    }

    // Conectar un Google a esta cuenta. Tiene que ser el del mismo
    // correo: quien está aquí ya probó que la cuenta es suya al entrar
    // con su contraseña, pero con un Google de otro correo acabaría con
    // la identidad partida en dos cuentas. Lo comprueba el backend; aquí
    // solo se enseña lo que responda.
    const handleGoogle = async (credential) => {
        setLinkError("")
        setLinking(true)

        const result = await connectGoogle(credential, store.token)

        if (sessionExpired(result)) return

        setLinking(false)

        if (!result.ok) {
            setLinkError(result.data.message)
            return
        }

        setKeys((current) => ({ ...current, hasGoogle: true }))
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

    // El encabezado es el mismo en los tres estados: así al cargar no
    // salta la pantalla entera, solo aparece lo de dentro. Lo que cambia
    // es el texto, porque al empleado no le sirve que le hablen de Google.
    const header = (
        <>
            <h2 className="cf-account__subtitle">Cómo entras en tu cuenta</h2>
            <p className="cf-account__lede">
                {isClient
                    ? "Puedes tener las dos formas a la vez. Con una contraseña propia podrás entrar aunque algún día no tengas acceso a tu Google."
                    : "Entras con tu correo y tu contraseña. Aquí puedes cambiarla siempre que quieras."}
            </p>
        </>
    )

    // ------------------------------------------------------------------
    // 1 · NO SE PUDO SABER
    //
    // Sin esto la pantalla enseñaba el formulario de CREAR contraseña a
    // quien ya tenía una: el botón mandaba el POST equivocado y el
    // backend respondía 409 después de escribirla tres veces.
    // ------------------------------------------------------------------
    if (loadError) {
        return (
            <div className="cf-account__card">
                {header}

                <p className="cf-dash-alert" role="alert">{loadError}</p>

                <button
                    type="button"
                    className="cf-dash-btn cf-dash-btn--ghost"
                    onClick={() => { setLoadError(""); setRetryKey((key) => key + 1) }}
                >
                    Reintentar
                </button>
            </div>
        )
    }

    // ------------------------------------------------------------------
    // 2 · TODAVÍA NO SE SABE
    // ------------------------------------------------------------------
    if (!keys) {
        return (
            <div className="cf-account__card">
                {header}
                <p className="cf-account__lede" role="status">Cargando…</p>
            </div>
        )
    }

    // ------------------------------------------------------------------
    // 3 · YA SE SABE
    // ------------------------------------------------------------------
    return (
        <div className="cf-account__card">
            {header}

            <div className="cf-account__keys">
                {/* Al empleado no se le nombra Google: no es una forma de
                    entrar que tenga, ni que pueda llegar a tener. */}
                {isClient && (
                    <div className="cf-account__key">
                        <i className="fa-brands fa-google" aria-hidden="true" />
                        <span>Google</span>
                        <span className={keys.hasGoogle ? "cf-account__key-on" : "cf-account__key-off"}>
                            {keys.hasGoogle ? "Conectado" : "Sin conectar"}
                        </span>
                    </div>
                )}

                <div className="cf-account__key">
                    <i className="fa-solid fa-lock" aria-hidden="true" />
                    <span>Contraseña</span>
                    <span className={keys.hasPassword ? "cf-account__key-on" : "cf-account__key-off"}>
                        {keys.hasPassword ? "Configurada" : "Sin configurar"}
                    </span>
                </div>
            </div>

            {/* Sin Google conectado, la forma de añadirlo: quien se
                registró con contraseña no podía usar nunca el botón. Solo
                al cliente, que es el único que entra por esa puerta. */}
            {isClient && !keys.hasGoogle && (
                <div className="cf-account__connect">
                    {/* El correo se dice ANTES de abrir el selector de Google.
                        Quien tiene varias sesiones abiertas elegiría a ciegas y
                        se comería el error de "ese Google usa otro correo".

                        store.user existe seguro: isClient lee su rol. */}
                    <p className="cf-account__lede">
                        Conecta tu Google y podrás entrar con un botón, sin escribir
                        la contraseña. Tiene que ser el de <strong>{store.user.email}</strong>,
                        el correo de tu cuenta.
                    </p>

                    {linkError && (
                        <p className="cf-dash-alert" role="alert">{linkError}</p>
                    )}

                    {linking
                        ? <p className="cf-account__lede" role="status">Conectando…</p>
                        : <GoogleButton
                            className="cf-account__google"
                            onCredential={handleGoogle}
                            onError={setLinkError}
                        />}
                </div>
            )}

            <p className="cf-account__lede">
                {hasPassword
                    ? "Cambia tu contraseña. Tendrás que usar la nueva la próxima vez que entres."
                    : "Crea una contraseña para poder entrar también sin Google."}
            </p>

            {/* noValidate: los avisos los damos nosotros, en español.
                autoComplete: así el gestor de contraseñas sabe cuál es cuál. */}
            <form className="cf-account__grid cf-account__grid--one" onSubmit={handleSubmit} noValidate>
                {hasPassword && passwordField("current_password", "Contraseña actual", "current-password")}
                {passwordField(
                    "new_password",
                    hasPassword ? "Contraseña nueva" : "Contraseña",
                    "new-password",
                    `Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`
                )}
                {passwordField(
                    "repeat_password",
                    hasPassword ? "Repite la contraseña nueva" : "Repite la contraseña",
                    "new-password"
                )}

                <div className="cf-account__actions">
                    {saveError && (
                        <p className="cf-dash-alert" role="alert">
                            {saveError}
                        </p>
                    )}
                    {saved && (
                        <p className="cf-account__saved" role="status">
                            <i className="fa-solid fa-check" aria-hidden="true" />
                            {hasPassword ? "Contraseña actualizada" : "Contraseña creada"}
                        </p>
                    )}

                    <button type="submit" className="cf-dash-btn" disabled={saving}>
                        {saving
                            ? "Guardando..."
                            : hasPassword ? "Cambiar contraseña" : "Crear contraseña"}
                    </button>
                </div>
            </form>
        </div>
    )
}
