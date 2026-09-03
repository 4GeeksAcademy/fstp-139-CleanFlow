const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const getProfile = async (token) => {
  const response = await fetch(`${BACKEND_URL}/api/profile`, {
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
};
