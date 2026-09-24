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

export const EUROS = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
});

// "08:00"
export const timeOf = (isoDate) => isoDate.slice(11, 16);

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
