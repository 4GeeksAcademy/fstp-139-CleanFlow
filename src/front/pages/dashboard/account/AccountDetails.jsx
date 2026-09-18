/**
 * AJUSTES · DATOS PERSONALES (#13).
 *
 * Foto para todos los roles. Nombre, apellidos y teléfono se editan; el
 * correo solo se ve, porque es con lo que se entra. El trabajador ve sus
 * datos en solo lectura: los gestiona el encargado desde Trabajadores.
 *
 * API: services/accountService.js
 *
 * Estilos: dashboard.css (cf-dash-*, cf-account__*).
 */

import { useEffect, useRef, useState } from "react"
import useGlobalReducer from "../../../hooks/useGlobalReducer"
import { getAccount, updateAccount, uploadAvatar, removeAvatar } from "../../../services/accountService"
import { Avatar } from "../../../components/dashboard/Avatar"

// Mismos topes y reglas que el backend, para avisar sin esperar respuesta.
const NAME_MAX_LENGTH = 100
const LAST_NAME_MAX_LENGTH = 150
const PHONE_MIN_DIGITS = 9
const PHONE_MAX_DIGITS = 15
const PHONE_ALLOWED = /^\+?[0-9 ]+$/

// Los mismos que acepta el backend en /account/avatar.
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"]
const AVATAR_MAX_BYTES = 2 * 1024 * 1024

// Los campos que se pueden editar. El correo y el rol no están: no se tocan.
const EMPTY_FORM = { name: "", last_name: "", phone: "" }

/** Mismos mensajes que routes.py: el usuario lee siempre lo mismo. */
const validate = (form) => {
    const errors = {}

    if (!form.name.trim()) errors.name = "El nombre es obligatorio"
    else if (form.name.trim().length > NAME_MAX_LENGTH)
        errors.name = `El nombre no puede superar los ${NAME_MAX_LENGTH} caracteres`

    if (!form.last_name.trim()) errors.last_name = "Los apellidos son obligatorios"
    else if (form.last_name.trim().length > LAST_NAME_MAX_LENGTH)
        errors.last_name = `Los apellidos no pueden superar los ${LAST_NAME_MAX_LENGTH} caracteres`

    const phone = form.phone.trim()
    const digits = phone.replace(/[^0-9]/g, "").length

    if (!phone) errors.phone = "El teléfono es obligatorio"
    else if (!PHONE_ALLOWED.test(phone) || digits < PHONE_MIN_DIGITS || digits > PHONE_MAX_DIGITS)
        errors.phone =
            `El teléfono tiene que tener entre ${PHONE_MIN_DIGITS} y ${PHONE_MAX_DIGITS} dígitos. ` +
            "Solo se admiten números, espacios y el signo + al principio"

    return errors
}

// ----------------------------------------------------------------------
// LA FOTO
// ----------------------------------------------------------------------
// Componente aparte y no una función dentro de AccountDetails: así no se
// vuelve a crear en cada render y no pierde su estado al escribir arriba.
// Lo usan los tres roles: la foto la cambia cualquiera.

const AvatarSection = ({ account, token, onUpdated, onSessionExpired }) => {
    const [preview, setPreview] = useState("")
    const [working, setWorking] = useState(false)
    const [error, setError] = useState("")

    // El <input type="file"> no se puede rellenar desde JavaScript, así que
    // se abre con el botón y se limpia por referencia.
    const fileRef = useRef(null)

    // La vista previa es una URL de memoria: hay que soltarla o el
    // navegador se queda con la imagen cargada.
    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview)
        }
    }, [preview])

    const clearFileInput = () => {
        if (fileRef.current) fileRef.current.value = ""
    }

    const handleFile = async (event) => {
        const file = event.target.files?.[0]

        if (!file) return

        setError("")

        // Se comprueba aquí para no subir 2 MB y que el backend los rechace.
        if (!AVATAR_TYPES.includes(file.type)) {
            setError("La foto tiene que ser JPG, PNG o WEBP")
            clearFileInput()
            return
        }

        if (file.size > AVATAR_MAX_BYTES) {
            setError("La foto no puede pesar más de 2 MB")
            clearFileInput()
            return
        }

        setPreview(URL.createObjectURL(file))
        setWorking(true)

        const result = await uploadAvatar(file, token)

        clearFileInput()

        if (onSessionExpired(result)) return

        setWorking(false)
        setPreview("")

        if (!result.ok) {
            setError(result.data.message)
            return
        }

        onUpdated(result.data)
    }

    const handleRemove = async () => {
        setError("")
        setWorking(true)

        const result = await removeAvatar(token)

        if (onSessionExpired(result)) return

        setWorking(false)

        if (!result.ok) {
            setError(result.data.message)
            return
        }

        onUpdated(result.data)
    }

    return (
        <div className="cf-account__card">
            <h2 className="cf-account__subtitle">Foto de perfil</h2>
            <p className="cf-account__lede">Se ve en el menú lateral y en tus reservas.</p>

            <div className="cf-account__photo">
                {/* Mientras sube se ve la foto elegida; el resto del tiempo, la
                    guardada o las iniciales. */}
                {preview ? (
                    <img className="cf-dash-avatar cf-dash-avatar--lg" src={preview} alt="Foto que estás subiendo" />
                ) : (
                    <Avatar user={account} size="lg" alt="Tu foto de perfil" />
                )}

                <div className="cf-account__photo-actions">
                    {/* El input va oculto y se abre desde el botón: el de serie
                        no se puede vestir y enseña un texto en inglés. */}
                    <input
                        ref={fileRef}
                        id="avatar"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFile}
                        disabled={working}
                        hidden
                    />

                    <div className="cf-account__photo-buttons">
                        <button
                            type="button"
                            className="cf-dash-btn"
                            onClick={() => fileRef.current?.click()}
                            disabled={working}
                        >
                            <i className="fa-solid fa-camera" aria-hidden="true" />
                            {working ? "Subiendo..." : account.avatar_url ? "Cambiar foto" : "Subir foto"}
                        </button>

                        {account.avatar_url && (
                            <button
                                type="button"
                                className="cf-dash-btn cf-dash-btn--ghost"
                                onClick={handleRemove}
                                disabled={working}
                            >
                                Quitar foto
                            </button>
                        )}
                    </div>

                    <p className="cf-account__photo-hint">
                        JPG, PNG o WEBP. Máximo 2 MB. Sin foto se ven tus iniciales.
                    </p>

                    {error && (
                        <p className="cf-dash-alert" role="alert">
                            {error}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

// ----------------------------------------------------------------------
// LA PÁGINA
// ----------------------------------------------------------------------

export const AccountDetails = () => {
    const { store, dispatch } = useGlobalReducer()

    const [account, setAccount] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")

    const [errors, setErrors] = useState({})
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState("")
    const [saved, setSaved] = useState(false)

    // Token caducado (401) o corrupto (422, lo da la librería de JWT): se
    // cierra la sesión y ProtectedRoutes manda al login. Devuelve true para
    // que quien llama no siga.
    const sessionExpired = (result) => {
        if (result.status === 401 || result.status === 422) {
            dispatch({ type: "LOGOUT" })
            return true
        }
        return false
    }

    const loadAccount = async () => {
        setLoading(true)
        setLoadError("")

        const result = await getAccount(store.token)

        if (sessionExpired(result)) return

        if (result.ok) {
            setAccount(result.data)
            setForm({
                name: result.data.name,
                last_name: result.data.last_name,
                phone: result.data.phone,
            })
        } else {
            setLoadError(result.data.message)
        }

        setLoading(false)
    }

    useEffect(() => {
        loadAccount()
    }, [store.token])

    // La respuesta de guardar, subir o quitar la foto trae las dos cosas:
    // los datos de la pantalla y el usuario de la sesión.
    const applyUpdate = (data) => {
        setAccount(data.account)
        dispatch({ type: "SET_USER", payload: data.user })
    }

    const handleChange = (event) => {
        const { name, value } = event.target

        setForm((current) => ({ ...current, [name]: value }))

        // El aviso de guardado y el error de antes dejan de valer en cuanto
        // se vuelve a escribir.
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

        const result = await updateAccount(form, store.token)

        if (sessionExpired(result)) return

        setSaving(false)

        if (!result.ok) {
            setSaveError(result.data.message)
            return
        }

        applyUpdate(result.data)
        setSaved(true)
    }

    if (loading) {
        return (
            <div className="cf-account__card" aria-busy="true">
                {/* Las barras grises no dicen nada a un lector de pantalla:
                    este texto sí, y no se ve. */}
                <p className="sr-only">Cargando tus datos...</p>

                <span className="cf-dash-skel cf-account__skel-title" />

                <div className="cf-account__grid" style={{ marginTop: "16px" }} aria-hidden="true">
                    <span className="cf-dash-skel cf-account__skel-line" />
                    <span className="cf-dash-skel cf-account__skel-line" />
                    <span className="cf-dash-skel cf-account__skel-line" />
                    <span className="cf-dash-skel cf-account__skel-line" />
                </div>
            </div>
        )
    }

    if (loadError) {
        return (
            <div className="cf-dash-state cf-dash-state--error" role="alert">
                <span className="cf-dash-state__icon">
                    <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                </span>
                <p className="cf-dash-state__title">No se han podido cargar tus datos</p>
                <p className="cf-dash-state__text">{loadError}</p>
                <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={loadAccount}>
                    Reintentar
                </button>
            </div>
        )
    }

    const photo = (
        <AvatarSection
            account={account}
            token={store.token}
            onUpdated={applyUpdate}
            onSessionExpired={sessionExpired}
        />
    )

    // El trabajador no edita sus datos aquí: solo mira. La foto sí la
    // cambia. El backend responde 403 si intenta lo demás.
    if (account.role === "worker") {
        return (
            <>
                {photo}

                <div className="cf-account__card">
                    <h2 className="cf-account__subtitle">Datos personales</h2>

                    {/* <dl>: son pares de concepto y valor, no una lista suelta. */}
                    <dl className="cf-account__data">
                        <div>
                            <dt>Nombre</dt>
                            <dd>{account.name}</dd>
                        </div>
                        <div>
                            <dt>Apellidos</dt>
                            <dd>{account.last_name}</dd>
                        </div>
                        <div>
                            <dt>Teléfono</dt>
                            <dd>{account.phone}</dd>
                        </div>
                        <div>
                            <dt>Correo electrónico</dt>
                            <dd>{account.email}</dd>
                        </div>
                    </dl>

                    <p className="cf-account__note">
                        <i className="fa-solid fa-circle-info" aria-hidden="true" />
                        <span>Si algún dato no es correcto, pídeselo a tu encargado.</span>
                    </p>
                </div>
            </>
        )
    }

    // Sin cambios no hay nada que guardar: el botón se queda apagado.
    const hasChanges =
        form.name !== account.name ||
        form.last_name !== account.last_name ||
        form.phone !== account.phone

    return (
        <>
            {photo}

            <div className="cf-account__card">
                <h2 className="cf-account__subtitle">Datos personales</h2>
                <p className="cf-account__lede">
                    Así te identificamos en tus reservas y así te avisa quien va a tu casa.
                </p>

                {/* noValidate: los avisos los damos nosotros, en español y con
                    los mismos textos que el backend. */}
                <form className="cf-account__grid" onSubmit={handleSubmit} noValidate>
                    <div className="cf-dash-field">
                        <label className="cf-dash-field__label" htmlFor="name">
                            Nombre
                        </label>
                        <input
                            className="cf-dash-input"
                            id="name"
                            name="name"
                            type="text"
                            value={form.name}
                            onChange={handleChange}
                            maxLength={NAME_MAX_LENGTH}
                            aria-invalid={Boolean(errors.name)}
                            aria-describedby={errors.name ? "name-error" : undefined}
                        />
                        {errors.name && (
                            <p className="cf-dash-field__error" id="name-error">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    <div className="cf-dash-field">
                        <label className="cf-dash-field__label" htmlFor="last_name">
                            Apellidos
                        </label>
                        <input
                            className="cf-dash-input"
                            id="last_name"
                            name="last_name"
                            type="text"
                            value={form.last_name}
                            onChange={handleChange}
                            maxLength={LAST_NAME_MAX_LENGTH}
                            aria-invalid={Boolean(errors.last_name)}
                            aria-describedby={errors.last_name ? "last_name-error" : undefined}
                        />
                        {errors.last_name && (
                            <p className="cf-dash-field__error" id="last_name-error">
                                {errors.last_name}
                            </p>
                        )}
                    </div>

                    <div className="cf-dash-field">
                        <label className="cf-dash-field__label" htmlFor="phone">
                            Teléfono
                        </label>
                        <input
                            className="cf-dash-input"
                            id="phone"
                            name="phone"
                            type="tel"
                            value={form.phone}
                            onChange={handleChange}
                            aria-invalid={Boolean(errors.phone)}
                            aria-describedby={errors.phone ? "phone-error" : undefined}
                        />
                        {errors.phone && (
                            <p className="cf-dash-field__error" id="phone-error">
                                {errors.phone}
                            </p>
                        )}
                    </div>

                    {/* readOnly y no disabled: un campo deshabilitado no se puede
                        ni seleccionar para copiar, y el lector de pantalla lo salta.
                        El candado y el fondo apagado avisan de que no se toca. */}
                    <div className="cf-dash-field">
                        <label className="cf-dash-field__label" htmlFor="email">
                            Correo electrónico
                        </label>
                        <input
                            className="cf-dash-input cf-account__input--locked"
                            id="email"
                            name="email"
                            type="email"
                            value={account.email}
                            readOnly
                        />
                        <p className="cf-account__lock">
                            <i className="fa-solid fa-lock" aria-hidden="true" />
                            El correo es con lo que entras y no se puede cambiar
                        </p>
                    </div>

                    <div className="cf-account__actions cf-account__full">
                        {saveError && (
                            <p className="cf-dash-alert" role="alert">
                                {saveError}
                            </p>
                        )}
                        {saved && (
                            <p className="cf-account__saved" role="status">
                                <i className="fa-solid fa-check" aria-hidden="true" />
                                Cambios guardados
                            </p>
                        )}

                        <button type="submit" className="cf-dash-btn" disabled={saving || !hasChanges}>
                            {saving ? "Guardando..." : "Guardar cambios"}
                        </button>
                    </div>
                </form>
            </div>
        </>
    )
}
