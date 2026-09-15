const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const getWorkers = async (token) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/workers`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    return {
      ok: response.ok,
      data,
    };
  } catch (error) {
    console.error("Error al obtener trabajadores:", error);

    return {
      ok: false,
      networkError: true,
      data: {
        error: "No se ha podido conectar con el servidor.",
      },
    };
  }
};

export const updateWorker = async (token, workerId, workerData) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/workers/${workerId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(workerData),
    });

    const data = await response.json();

    return {
      ok: response.ok,
      data,
    };
  } catch (error) {
    console.error("Error al actualizar trabajador:", error);

    return {
      ok: false,
      networkError: true,
      data: {
        error: "No se ha podido conectar con el servidor.",
      },
    };
  }
};
export const createWorker = async (token, workerData) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/workers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(workerData),
    });

    const data = await response.json();

    return {
      ok: response.ok,
      data,
    };
  } catch (error) {
    console.error("Error al crear trabajador:", error);

    return {
      ok: false,
      networkError: true,
      data: {
        error: "No se ha podido conectar con el servidor.",
      },
    };
  }
};
