/**
 * Llamada al backend para el formulario de contacto de la landing.
 *
 * Igual que el resto de servicios: solo habla con la API, nunca lanza,
 * y devuelve siempre { ok, data }.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const sendContactMessage = async (formData) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/contact-messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    return {
      ok: response.ok,
      data,
    };
  } catch (error) {
    console.error("Fallo de red al enviar el mensaje de contacto:", error);

    return {
      ok: false,
      networkError: true,
      data: {
        error:
          "No se ha podido conectar con el servidor. Inténtalo de nuevo en unos segundos.",
      },
    };
  }
};
