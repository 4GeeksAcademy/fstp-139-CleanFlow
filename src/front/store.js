export const initialStore = () => {
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    user = null;
    localStorage.removeItem("user");
  }

  return {
    token: localStorage.getItem("token") || null,
    user,
  };
};

export default function storeReducer(store, action = {}) {
  switch (action.type) {
    case "LOGIN": {
      const { token, user } = action.payload;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      return {
        ...store,
        token,
        user,
      };
    }

    case "LOGOUT":
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      return {
        ...store,
        token: null,
        user: null,
      };

    case "SET_USER":
      localStorage.setItem("user", JSON.stringify(action.payload));

      return {
        ...store,
        user: action.payload,
      };

    default:
      throw Error("Unknown action.");
  }
}
