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
 * Sin estilos todavía: se visten en el paso 13 de la #13.
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
            <div aria-busy="true">
                <h2>Direcciones</h2>
                <p>Cargando tus direcciones...</p>
            </div>
        )
    }

    if (loadError) {
        return (
            <div>
                <h2>Direcciones</h2>

                <div role="alert">
                    <p>No se han podido cargar tus direcciones</p>
                    <p>{loadError}</p>
                    <button type="button" onClick={loadAddresses}>
                        Reintentar
                    </button>
                </div>
            </div>
        )
    }

    // Con el formulario abierto ocupa el sitio de la lista: es largo, y
    // encima de ella dejaría la lista muy abajo en móvil.
    if (editing) {
        return (
            <div>
                <h2>Direcciones</h2>

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
        <div>
            <h2>Direcciones</h2>
            <p>Donde quieres que se haga la limpieza. La principal sale elegida al contratar.</p>

            {actionError && <p role="alert">{actionError}</p>}

            {addresses.length === 0 ? (
                <div>
                    <p>Todavía no tienes ninguna dirección.</p>
                    <button type="button" onClick={() => openForm(null)}>
                        Añadir la primera
                    </button>
                </div>
            ) : (
                <>
                    <ul>
                        {addresses.map((address) => (
                            <li key={address.address_id}>
                                <p>
                                    {address.street}, {address.number}
                                    {address.floor && `, ${address.floor}`}
                                </p>
                                <p>
                                    {address.postal_code} {address.city}
                                </p>
                                {address.access_notes && <p>{address.access_notes}</p>}

                                {address.is_default && <p>Principal</p>}

                                {/* aria-label: con varios botones iguales, el
                                    lector de pantalla necesita saber cuál es cuál. */}
                                <button
                                    type="button"
                                    onClick={() => openForm(address)}
                                    aria-label={`Editar ${address.street}, ${address.number}`}
                                >
                                    Editar
                                </button>

                                {!address.is_default && (
                                    <button
                                        type="button"
                                        onClick={() => handleSetDefault(address)}
                                        disabled={workingId === address.address_id}
                                        aria-label={`Marcar como principal ${address.street}, ${address.number}`}
                                    >
                                        Marcar como principal
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setConfirming(address)}
                                    disabled={workingId === address.address_id}
                                    aria-label={`Quitar ${address.street}, ${address.number}`}
                                >
                                    Quitar
                                </button>
                            </li>
                        ))}
                    </ul>

                    <button type="button" onClick={() => openForm(null)}>
                        Añadir dirección
                    </button>
                </>
            )}

            {confirming && (
                // onClick en el propio dialog: solo llega aquí el clic en el
                // fondo oscuro, porque el contenido va dentro del div.
                <dialog
                    ref={dialogRef}
                    aria-labelledby="confirm-address-title"
                    onClose={() => setConfirming(null)}
                    onClick={(event) => event.target === event.currentTarget && closeDialog()}
                >
                    <div>
                        <h3 id="confirm-address-title">
                            ¿Quitar {confirming.street}, {confirming.number}?
                        </h3>
                        <p>
                            Dejará de salir al contratar. Las reservas que ya la usan no cambian.
                        </p>

                        {/* autoFocus en Cancelar: con Enter no se quita por error. */}
                        <button type="button" onClick={closeDialog} autoFocus>
                            Cancelar
                        </button>
                        <button type="button" onClick={confirmDelete}>
                            Quitar dirección
                        </button>
                    </div>
                </dialog>
            )}
        </div>
    )
}