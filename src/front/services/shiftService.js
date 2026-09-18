const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const getShifts = async (token) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/shifts`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();

        return {
            ok: response.ok,
            data,
        };
    } catch (error) {
        console.error("Error al consultar los turnos:", error);

        return {
            ok: false,
            data: {
                message: "No se han podido cargar los turnos.",
            },
        };
    }
};

export const createShift = async (token, shiftData) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/shifts`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(shiftData),
        });

        const data = await response.json();

        return {
            ok: response.ok,
            data,
        };
    } catch (error) {
        console.error("Error al crear el turno:", error);

        return {
            ok: false,
            data: {
                message: "No se ha podido confirmar la creación del turno. Recarga la lista antes de volver a intentarlo.",
            },
        };
    }
};
export const updateShift = async (token, shiftId, shiftData) => {
    try {
        const response = await fetch(
            `${BACKEND_URL}/api/shifts/${shiftId}`,
            {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(shiftData),
            }
        );

        const data = await response.json();

        return {
            ok: response.ok,
            data,
        };
    } catch (error) {
        console.error("Error al actualizar el turno:", error);

        return {
            ok: false,
            data: {
                message: "No se ha podido confirmar la actualización del turno. Recarga la lista para comprobar su estado.",
            },
        };
    }
};
export const deleteShift = async (token, shiftId) => {
    try {
        const response = await fetch(
            `${BACKEND_URL}/api/shifts/${shiftId}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data = await response.json();

        return {
            ok: response.ok,
            data,
        };
    } catch (error) {
        console.error("Error al eliminar el turno:", error);

        return {
            ok: false,
            data: {
                message: "No se ha podido confirmar la eliminación. Recarga la lista para comprobar si el turno sigue existiendo.",
            },
        };
    }
};