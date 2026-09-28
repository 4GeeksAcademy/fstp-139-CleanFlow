/**
 * Llamada al backend para el formulario de contacto de la landing.
 *
 * Vía apiRequest (services/apiClient.js): separa un fallo de red real de
 * una respuesta que no es JSON (por ejemplo, el index.html de la ruta
 * comodín de Flask mientras /api/contact-messages no exista). Nunca lanza,
 * y devuelve siempre { ok, status, data } con el texto en data.message.
 */

import { apiRequest } from "./apiClient";

export const sendContactMessage = async (formData) => {
    return await apiRequest("/api/contact-messages", { method: "POST", body: formData });
};

// Lectura y gestión del encargado; el formulario público conserva su llamada.
export const getContactMessages = (token) =>
    apiRequest("/api/contact-messages", { token });

export const updateMessageStatus = (id, status, token) =>
    apiRequest(`/api/contact-messages/${id}/status`, {
        method: "PATCH",
        token,
        body: { status },
    });
