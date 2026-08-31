const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

export const login = async (email, password) => {
    const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: "POST",
        body: JSON.stringify({
            email,
            password,
        }),
        headers: {
            "Content-Type": "application/json",
        },
    });
    const data = await response.json();
    return {
        ok: response.ok,
        data,
    };
};