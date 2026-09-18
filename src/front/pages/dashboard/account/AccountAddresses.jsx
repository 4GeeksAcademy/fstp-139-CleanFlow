/**
 * AJUSTES · DIRECCIONES (#13). Solo cliente.
 *
 * Lista de direcciones: añadir, editar, marcar la principal y quitar. La
 * principal es la que saldrá elegida al contratar (#14).
 *
 * Quitar no borra: el backend la desactiva, porque puede haber reservas
 * que apunten a ella.
 *
 * API: services/addressService.js · Formulario: components/dashboard/AddressForm.jsx
 *
 * Estilos: dashboard.css (cf-dash-*, cf-account__*).
 */

import { useEffect, useRef, useState } from "react"
import useGlobalReducer from "../../../hooks/useGlobalReducer"
import {
    getAddresses,
    createAddress,
    updateAddress,
    setDefaultAddress,
    deleteAddress,
} from "../../../services/addressService"
import { AddressForm } from "../../../components/dashboard/AddressForm"

export const AccountAddresses = () => {
    const { store, dispatch } = useGlobalReducer()

    const [addresses, setAddresses] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")

    // editing: null = lista · { address: null } = creando · { address } = editando
    const [editing, setEditing] = useState(null)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState("")

    // Errores de marcar principal o quitar, que pasan fuera del formulario.
    const [actionError, setActionError] = useState("")
    const [workingId, setWorkingId] = useState(null)

    // La dirección que se va a quitar, o null.
    const [confirming, setConfirming] = useState(null)
    const dialogRef = useRef(null)

    // Token caducado (401) o corrupto (422): se cierra la sesión y
    // ProtectedRoutes manda al login.
    const sessionExpired = (result) => {
        if (result.status === 401 || result.status === 422) {
            dispatch({ type: "LOGOUT" })
            return true
        }
        return false
    }

    const loadAddresses = async () => {
        setLoading(true)
        setLoadError("")

        const result = await getAddresses(store.token)

        if (sessionExpired(result)) return

        if (result.ok) {
            setAddresses(result.data)
        } else {
            setLoadError(result.data.message)
        }

        setLoading(false)
    }

    useEffect(() => {
        loadAddresses()
    }, [store.token])

    // showModal() y no un div encima: el navegador bloquea el resto de la
    // página, cierra con Escape y devuelve el foco al salir.
    useEffect(() => {
        if (confirming) dialogRef.current?.showModal()
    }, [confirming])

    // ------------------------------------------------------------------
    // FORMULARIO
    // ------------------------------------------------------------------

    const openForm = (address) => {
        setEditing({ address })
        setFormError("")
        setActionError("")
    }

    const closeForm = () => {
        setEditing(null)
        setFormError("")
    }

    const handleSave = async (payload) => {
        setSaving(true)
        setFormError("")

        const result = editing.address
            ? await updateAddress(editing.address.address_id, payload, store.token)
            : await createAddress(payload, store.token)

        if (sessionExpired(result)) return

        setSaving(false)

        if (!result.ok) {
            setFormError(result.data.message)
            return
        }

        // Al crear, la nueva puede nacer como principal; al editar cambia el
        // orden si se toca la ciudad. Se vuelve a pedir la lista, que llega
        // ya ordenada por el backend.
        closeForm()
        loadAddresses()
    }

    // ------------------------------------------------------------------
    // PRINCIPAL Y QUITAR
    // ------------------------------------------------------------------
    // Las dos devuelven la lista entera ya reordenada: no hay que
    // recalcular aquí cuál es la principal.

    const handleSetDefault = async (address) => {
        setWorkingId(address.address_id)
        setActionError("")

        const result = await setDefaultAddress(address.address_id, store.token)

        if (sessionExpired(result)) return

        setWorkingId(null)

        if (!result.ok) {
            setActionError(result.data.message)
            return
        }

        setAddresses(result.data)
    }

    const closeDialog = () => dialogRef.current?.close()

    const confirmDelete = async () => {
        const address = confirming

        closeDialog()
        setWorkingId(address.address_id)
        setActionError("")

        const result = await deleteAddress(address.address_id, store.token)

        if (sessionExpired(result)) return

        setWorkingId(null)

        if (!result.ok) {
            setActionError(result.data.message)
            return
        }

        setAddresses(result.data)
    }

    // ------------------------------------------------------------------
    // PANTALLA
    // ------------------------------------------------------------------

    if (loading) {
        return (
            <div className="cf-account__card" aria-busy="true">
                {/* Las barras grises no dicen nada a un lector de pantalla:
                    este texto sí, y no se ve. */}
                <p className="sr-only">Cargando tus direcciones...</p>

                <span className="cf-dash-skel cf-account__skel-title" />

                <div className="cf-account__list" style={{ marginTop: "16px" }} aria-hidden="true">
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
                <p className="cf-dash-state__title">No se han podido cargar tus direcciones</p>
                <p className="cf-dash-state__text">{loadError}</p>
                <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={loadAddresses}>
                    Reintentar
                </button>
            </div>
        )
    }

    // Con el formulario abierto ocupa el sitio de la lista: es largo, y
    // encima de ella dejaría la lista muy abajo en móvil.
    if (editing) {
        return (
            <div className="cf-account__card">
                <AddressForm
                    key={editing.address ? editing.address.address_id : "new"}
                    address={editing.address}
                    saving={saving}
                    apiError={formError}
                    onSubmit={handleSave}
                    onCancel={closeForm}
                />
            </div>
        )
    }

    return (
        <div className="cf-account__card">
            <h2 className="cf-account__subtitle">Direcciones</h2>
            <p className="cf-account__lede">
                Donde quieres que se haga la limpieza. La principal sale elegida al contratar.
            </p>

            {actionError && (
                <p className="cf-dash-alert" role="alert">
                    {actionError}
                </p>
            )}

            {addresses.length === 0 ? (
                <div className="cf-dash-state">
                    <span className="cf-dash-state__icon">
                        <i className="fa-solid fa-house" aria-hidden="true" />
                    </span>
                    <p className="cf-dash-state__title">Todavía no tienes ninguna dirección</p>
                    <p className="cf-dash-state__text">
                        Añade dónde quieres que se haga la limpieza; podrás elegirla al contratar.
                    </p>
                    <button type="button" className="cf-dash-btn" onClick={() => openForm(null)}>
                        <i className="fa-solid fa-plus" aria-hidden="true" />
                        Añadir la primera
                    </button>
                </div>
            ) : (
                <>
                    <ul className="cf-account__list">
                        {addresses.map((address) => (
                            <li
                                key={address.address_id}
                                className={
                                    "cf-account__address" +
                                    (address.is_default ? " cf-account__address--default" : "")
                                }
                            >
                                <div className="cf-account__address-top">
                                    <div>
                                        <p className="cf-account__address-street">
                                            {address.street}, {address.number}
                                            {address.floor && `, ${address.floor}`}
                                        </p>
                                        <p className="cf-account__address-city">
                                            {address.postal_code} {address.city}
                                        </p>
                                        {address.access_notes && (
                                            <p className="cf-account__address-notes">{address.access_notes}</p>
                                        )}
                                    </div>

                                    {address.is_default && (
                                        <span className="cf-account__badge">
                                            <i className="fa-solid fa-star" aria-hidden="true" />
                                            Principal
                                        </span>
                                    )}
                                </div>

                                <div className="cf-account__address-actions">
                                    {/* aria-label: con varios botones iguales, el
                                        lector de pantalla necesita saber cuál es cuál. */}
                                    <button
                                        type="button"
                                        className="cf-dash-btn cf-dash-btn--ghost cf-dash-btn--sm"
                                        onClick={() => openForm(address)}
                                        aria-label={`Editar ${address.street}, ${address.number}`}
                                    >
                                        <i className="fa-solid fa-pen" aria-hidden="true" />
                                        Editar
                                    </button>

                                    {!address.is_default && (
                                        <button
                                            type="button"
                                            className="cf-dash-btn cf-dash-btn--ghost cf-dash-btn--sm"
                                            onClick={() => handleSetDefault(address)}
                                            disabled={workingId === address.address_id}
                                            aria-label={`Marcar como principal ${address.street}, ${address.number}`}
                                        >
                                            <i className="fa-solid fa-star" aria-hidden="true" />
                                            Marcar como principal
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        className="cf-dash-btn cf-dash-btn--ghost cf-dash-btn--sm cf-dash-btn--danger-ghost"
                                        onClick={() => setConfirming(address)}
                                        disabled={workingId === address.address_id}
                                        aria-label={`Quitar ${address.street}, ${address.number}`}
                                    >
                                        <i className="fa-solid fa-trash" aria-hidden="true" />
                                        Quitar
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <div className="cf-account__actions">
                        <button type="button" className="cf-dash-btn" onClick={() => openForm(null)}>
                            <i className="fa-solid fa-plus" aria-hidden="true" />
                            Añadir dirección
                        </button>
                    </div>
                </>
            )}

            {confirming && (
                // onClick en el propio dialog: solo llega aquí el clic en el
                // fondo oscuro, porque el contenido va dentro del div.
                <dialog
                    ref={dialogRef}
                    className="cf-dash-modal"
                    aria-labelledby="confirm-address-title"
                    onClose={() => setConfirming(null)}
                    onClick={(event) => event.target === event.currentTarget && closeDialog()}
                >
                    <div className="cf-dash-modal__body">
                        <span className="cf-dash-modal__icon">
                            <i className="fa-solid fa-trash" aria-hidden="true" />
                        </span>
                        <h2 className="cf-dash-modal__title" id="confirm-address-title">
                            ¿Quitar {confirming.street}, {confirming.number}?
                        </h2>
                        <p className="cf-dash-modal__text">
                            Dejará de salir al contratar. Las reservas que ya la usan no cambian.
                        </p>

                        <div className="cf-dash-modal__actions">
                            {/* autoFocus en Cancelar: con Enter no se quita por error. */}
                            <button type="button" className="cf-dash-btn cf-dash-btn--ghost" onClick={closeDialog} autoFocus>
                                Cancelar
                            </button>
                            <button type="button" className="cf-dash-btn cf-dash-btn--danger" onClick={confirmDelete}>
                                Quitar dirección
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </div>
    )
}
