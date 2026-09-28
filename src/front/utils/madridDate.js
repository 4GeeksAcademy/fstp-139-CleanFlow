// La misma fecha de Mis tareas, compartida para no depender del huso del navegador.
export const madridToday = (now = new Date()) => new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
}).format(now);

export const madridMoment = (now = new Date()) => {
    const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).format(now);
    return `${madridToday(now)}T${time}`;
};

// UTC aquí solo suma fechas del calendario; nunca interpreta horas del servicio.
export const addCalendarDays = (date, count) => {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + count);
    return value.toISOString().slice(0, 10);
};
