/**
 * FORMATO DE FECHAS Y DINERO DEL DETALLE.
 *
 * Las fechas llegan en hora de Madrid y sin zona ("2026-09-23T08:00:00").
 * Se recortan con slice en vez de pasarlas por Date: construir un Date
 * las movería al huso del navegador y un servicio de las 08:00 podría
 * enseñarse a las 07:00.
 */

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles",
                  "jueves", "viernes", "sábado"];

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
                "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Los mismos, recortados para el bloque de fecha de la tarjeta.
const SHORT_MONTHS = MONTHS.map((month) => month.slice(0, 3));

// Días que tiene el cliente para responder antes de que el servicio se
// dé por bueno solo (#83). Aquí solo se cuentan: confirmar es cosa suya.
export const CONFIRM_DAYS = 3;

export const EUROS = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
});

// "08:00"
export const timeOf = (isoDate) => isoDate.slice(11, 16);

// "24" y "sep": las dos piezas del bloque de fecha.
export const dayOf = (isoDate) => isoDate.slice(8, 10);
export const monthOf = (isoDate) => SHORT_MONTHS[Number(isoDate.slice(5, 7)) - 1];

// "Ana G." -> "AG", para cuando el trabajador no tiene foto.
export const initialsOf = (name) =>
    (name || "")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join("");

// "Martes 23 de septiembre". El Date se arma con los números sueltos,
// que para eso no tiene zona: solo se usa para saber el día de la semana.
export const longDate = (isoDate) => {
    const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
    const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()];

    return `${weekday[0].toUpperCase()}${weekday.slice(1)} ${day} de ${MONTHS[month - 1]}`;
};

// "23 sep · 08:00", para los hitos de la línea de tiempo.
export const shortMoment = (isoDate) => {
    const day = Number(isoDate.slice(8, 10));
    const month = MONTHS[Number(isoDate.slice(5, 7)) - 1].slice(0, 3);

    return `${day} ${month} · ${timeOf(isoDate)}`;
};

// La fecha sin zona, sumándole días. Solo se usa para el plazo de
// confirmación, así que basta con el día. Sin fecha no hay plazo: se
// devuelve null en vez de reventar.
const plusDays = (isoDate, days) => {
    if (!isoDate) return null;

    const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);

    return new Date(year, month - 1, day + days);
};

// "26 de septiembre": el día en que el servicio se dará por bueno solo.
export const deadlineOf = (isoDate, days = CONFIRM_DAYS) =>
    plusDays(isoDate, days)?.toLocaleDateString("es-ES", { day: "numeric", month: "long" }) || "";

// Cuántos días enteros quedan para ese plazo. Nunca menos de cero.
export const daysLeft = (isoDate, days = CONFIRM_DAYS) => {
    const limit = plusDays(isoDate, days);

    if (!limit) return 0;

    const today = new Date();
    const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return Math.max(Math.ceil((limit - midnight) / 86400000), 0);
};
