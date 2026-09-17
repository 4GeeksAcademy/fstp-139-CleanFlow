/**
 * AJUSTES · DATOS PERSONALES (#13).
 *
 * Foto para todos los roles. Nombre, apellidos y teléfono se editan; el
 * correo solo se ve, porque es con lo que se entra. El trabajador ve sus
 * datos en solo lectura: los gestiona el encargado desde Trabajadores.
 *
 * API: services/accountService.js
 *
 * Sin estilos todavía: se visten en el paso 13 de la #13.
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
        <div>
            <h3>Foto de perfil</h3>

            {/* Mientras sube se ve la foto elegida; el resto del tiempo, la
                guardada o las iniciales. */}
            {preview ? (
                <img src={preview} alt="Foto que estás subiendo" width="96" height="96" />
            ) : (
                <Avatar user={account} size="lg" alt="Tu foto de perfil" />
            )}

            {/* El input va oculto y se abre desde el botón: el de serie no
                se puede vestir y enseña un texto en inglés. */}
            <input
                ref={fileRef}
                id="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFile}
                disabled={working}
                hidden
            />

            <button type="button" onClick={() => fileRef.current?.click()} disabled={working}>
                {working ? "Subiendo..." : account.avatar_url ? "Cambiar foto" : "Subir foto"}
            </button>

            {account.avatar_url && (
                <button type="button" onClick={handleRemove} disabled={working}>
                    Quitar foto
                </button>
            )}

            <p>JPG, PNG o WEBP. Máximo 2 MB. Sin foto se ven tus iniciales.</p>

            {error && <p role="alert">{error}</p>}
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
            <div aria-busy="true">
                <h2>Datos personales</h2>
                <p>Cargando tus datos...</p>
            </div>
        )
    }

    if (loadError) {
        return (
            <div>
                <h2>Datos personales</h2>

                <div role="alert">
                    <p>No se han podido cargar tus datos</p>
                    <p>{loadError}</p>
                    <button type="button" onClick={loadAccount}>
                        Reintentar
                    </button>
                </div>
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
            <div>
                <h2>Datos personales</h2>

                {photo}

                <dl>
                    <dt>Nombre</dt>
                    <dd>{account.name}</dd>
                    <dt>Apellidos</dt>
                    <dd>{account.last_name}</dd>
                    <dt>Teléfono</dt>
                    <dd>{account.phone}</dd>
                    <dt>Correo electrónico</dt>
                    <dd>{account.email}</dd>
                </dl>

                <p>Si algún dato no es correcto, pídeselo a tu encargado.</p>
            </div>
        )
    }

    // Sin cambios no hay nada que guardar: el botón se queda apagado.
    const hasChanges =
        form.name !== account.name ||
        form.last_name !== account.last_name ||
        form.phone !== account.phone

    return (
        <div>
            <h2>Datos personales</h2>

            {photo}

            {/* noValidate: los avisos los damos nosotros, en español y con
                los mismos textos que el backend. */}
            <form onSubmit={handleSubmit} noValidate>
                <div>
                    <label htmlFor="name">Nombre</label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        value={form.name}
                        onChange={handleChange}
                        maxLength={NAME_MAX_LENGTH}
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? "name-error" : undefined}
                    />
                    {errors.name && <p id="name-error">{errors.name}</p>}
                </div>

                <div>
                    <label htmlFor="last_name">Apellidos</label>
                    <input
                        id="last_name"
                        name="last_name"
                        type="text"
                        value={form.last_name}
                        onChange={handleChange}
                        maxLength={LAST_NAME_MAX_LENGTH}
                        aria-invalid={Boolean(errors.last_name)}
                        aria-describedby={errors.last_name ? "last_name-error" : undefined}
                    />
                    {errors.last_name && <p id="last_name-error">{errors.last_name}</p>}
                </div>

                <div>
                    <label htmlFor="phone">Teléfono</label>
                    <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handleChange}
                        aria-invalid={Boolean(errors.phone)}
                        aria-describedby={errors.phone ? "phone-error" : undefined}
                    />
                    {errors.phone && <p id="phone-error">{errors.phone}</p>}
                </div>

                {/* readOnly y no disabled: un campo deshabilitado no se puede
                    ni seleccionar para copiar, y el lector de pantalla lo salta. */}
                <div>
                    <label htmlFor="email">Correo electrónico</label>
                    <input id="email" name="email" type="email" value={account.email} readOnly />
                    <p>El correo es con lo que entras y no se puede cambiar.</p>
                </div>

                {saveError && <p role="alert">{saveError}</p>}
                {saved && <p role="status">Cambios guardados</p>}

                <button type="submit" disabled={saving || !hasChanges}>
                    {saving ? "Guardando..." : "Guardar cambios"}
                </button>
            </form>
        </div>
    )
}