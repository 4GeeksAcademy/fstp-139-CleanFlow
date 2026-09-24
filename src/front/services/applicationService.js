const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Endpoint provisional hasta confirmar la ruta definitiva con el equipo.
const JOB_APPLICATION_ENDPOINT = "/api/job-applications";

export const sendJobApplication = async (formData) => {
  try {
    const response = await fetch(`${BACKEND_URL}${JOB_APPLICATION_ENDPOINT}`, {
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
    console.error("Fallo de red al enviar la candidatura:", error);

    return {
      ok: false,
      networkError: true,
      data: {
        error: "No se pudo conectar con el servidor.",
      },
    };
  }
};
export const getJobApplications = async (token) => {
  try {
    const response = await fetch(`${BACKEND_URL}${JOB_APPLICATION_ENDPOINT}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    console.error("Fallo de red al cargar las candidaturas:", error);

    return {
      ok: false,
      networkError: true,
      data: {
        error: "No se pudo conectar con el servidor.",
      },
    };
  }
};

export const updateApplicationStatus = async (id, status, token) => {
  try {
    const response = await fetch(
      `${BACKEND_URL}${JOB_APPLICATION_ENDPOINT}/${id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      },
    );

    const data = await response.json();

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    console.error("Fallo de red al actualizar la candidatura:", error);

    return {
      ok: false,
      networkError: true,
      data: {
        error: "No se pudo conectar con el servidor.",
      },
    };
  }
};
