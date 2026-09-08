/**
 * Estado global de la sesión (`token` y `user`).
 * Utilizado por el sidebar, guardianes de rutas y dashboard.
 *
 * Principios de arquitectura:
 * 
 * 1. Carga síncrona: Se restaura desde `localStorage` al arrancar para que los 
 *    guardianes conozcan el rol antes del primer render y eviten redirecciones falsas en F5.
 * 
 * 2. Fuente única de verdad: Toda escritura en `localStorage` ocurre exclusivamente 
 *    en el reducer (nunca en componentes) para evitar desincronizaciones.
 *
 * Se conecta a la app en hooks/useGlobalReducer.jsx (useReducer + context).
 */

/**
 * Estado inicial: se ejecuta una sola vez, al arrancar la aplicación.
 * Recupera la sesión que quedó guardada de la última visita.
 */
export const initialStore = () => {
  let user = null;

  try {
    // localStorage solo guarda texto, así que hay que reconstruir el
    // objeto con JSON.parse.
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    // Si el valor guardado está corrupto, JSON.parse lanza. Sin este
    // catch la aplicación no llegaría ni a arrancar: pantalla en blanco
    // y sin ninguna pista. Se descarta el dato malo y se sigue sin sesión;
    // la revalidación de ProtectedRoutes recuperará el usuario si el
    // token sigue siendo válido.
    user = null;
    localStorage.removeItem("user");
  }

  return {
    // || null: si la clave no existe, getItem devuelve null igualmente,
    // pero esto deja explícito que la ausencia de token es null y no "".
    token: localStorage.getItem("token") || null,
    user,
  };
};

/**
 * Reducer: recibe el estado actual y una acción, y devuelve el estado
 * nuevo. Es el único sitio donde cambia la sesión.
 *
 * Importante: nunca modifica el objeto que recibe, crea uno nuevo con
 * el spread (...store). React compara referencias para saber si algo
 * cambió; mutando el original no se enteraría y no repintaría.
 */
export default function storeReducer(store, action = {}) {
  switch (action.type) {

    // Login correcto: llegan token y usuario juntos desde /api/login.
    case "LOGIN": {
      const { token, user } = action.payload;

      localStorage.setItem("token", token);
      // JSON.stringify porque localStorage no guarda objetos, solo texto.
      localStorage.setItem("user", JSON.stringify(user));

      return {
        ...store,
        token,
        user,
      };
    }

    // Cerrar sesión: se limpian las dos copias, la del disco y la del
    // store. Ojo: esto no invalida el token en el servidor (un JWT no se
    // puede revocar), solo se deja de usar.
    case "LOGOUT":
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      return {
        ...store,
        token: null,
        user: null,
      };

    // Refresca solo el usuario, sin tocar el token. Lo usa la
    // revalidación de ProtectedRoutes para traer el rol actualizado si
    // alguien lo cambió en la base de datos.
    case "SET_USER":
      localStorage.setItem("user", JSON.stringify(action.payload));

      return {
        ...store,
        user: action.payload,
      };

    // Acción desconocida: se avisa por consola (para cazar erratas) pero
    // NO se lanza una excepción. Un reducer que lanza tumba la aplicación
    // entera: React desmonta todo el árbol y solo se recupera con F5.
    default:
      console.warn(`Acción desconocida en el store: "${action.type}"`);
      return store;
  }
}
