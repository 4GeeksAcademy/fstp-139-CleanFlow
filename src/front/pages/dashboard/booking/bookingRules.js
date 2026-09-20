/**
 * LAS CUENTAS DE UNA RESERVA (#14).
 *
 * Las mismas que hace el backend en routes.py (hours_needed y
 * validate_booking). Aquí solo sirven para enseñarlas en directo mientras
 * el cliente elige: quien decide es siempre el servidor.
 *
 * ⚠️ Si cambia una regla, hay que cambiarla en los dos sitios. Si no, el
 * panel enseña un precio y el servidor rechaza la reserva.
 */

// Jornada máxima de un trabajador, la duración de un turno: una reserva más
// larga se reparte en varios días (12 h = 8 + 4). Igual que
// MAX_HOURS_PER_DAY en availability.py.
export const MAX_HOURS_PER_DAY = 8;

// Tope de horas cuando el servicio no tiene el suyo. Igual que
// MAX_REQUEST_HOURS en routes.py, que es lo que acepta la disponibilidad.
export const MAX_HOURS = 60;

/**
 * Horas mínimas que exigen las tareas:
 *
 *   tareas × minutos  →  a horas, redondeando hacia arriba
 *                     →  nunca menos que el mínimo del servicio
 *                     →  subido hasta respetar el salto (6, 9, 12...)
 *
 * Fin de obra (sin minutos por tarea) necesita solo su mínimo.
 */
export const hoursNeeded = (service, taskCount) => {
  if (!service) return 0;

  if (service.minutes_per_task == null) return service.min_hours;

  // La hora se cobra entera: 90 minutos de trabajo son 2 horas.
  const hours = Math.max(
    Math.ceil((taskCount * service.minutes_per_task) / 60),
    service.min_hours
  );

  // Cuántos saltos hacen falta por encima del mínimo.
  const steps = Math.ceil((hours - service.min_hours) / service.hour_step);

  return service.min_hours + steps * service.hour_step;
};

/** Las horas entre las que puede elegir: desde las necesarias hasta el tope. */
export const hourOptions = (service, taskCount) => {
  if (!service) return [];

  const last = Math.min(service.max_hours ?? MAX_HOURS, MAX_HOURS);
  const options = [];

  for (let hours = hoursNeeded(service, taskCount); hours <= last; hours += service.hour_step) {
    options.push(hours);
  }

  return options;
};

/** Si las tareas elegidas caben en las horas elegidas. */
export const tasksFit = (service, hours, taskCount) => hours >= hoursNeeded(service, taskCount);

/** Tareas que aún caben en esas horas: "te caben 2 tareas más". */
export const spareTasks = (service, hours, taskCount) => {
  if (!service || service.minutes_per_task == null) return 0;

  return Math.max(Math.floor((hours * 60) / service.minutes_per_task) - taskCount, 0);
};

/** Precio total: horas × tarifa. El backend lo vuelve a calcular. */
export const totalPrice = (service, hours) =>
  service ? Math.round(hours * service.base_hourly_rate * 100) / 100 : 0;

/** Las horas repartidas en días: 9 -> [8, 1] · 12 -> [8, 4]. */
export const splitIntoDays = (hours) => {
  const fullDays = Math.floor(hours / MAX_HOURS_PER_DAY);
  const rest = hours % MAX_HOURS_PER_DAY;

  return [...Array(fullDays).fill(MAX_HOURS_PER_DAY), ...(rest ? [rest] : [])];
};