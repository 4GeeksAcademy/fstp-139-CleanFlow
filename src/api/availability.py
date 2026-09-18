"""
DISPONIBILIDAD: cuándo se puede reservar a cada trabajador (#69).

Aquí solo hay cálculo. Las funciones reciben los datos ya cargados y
devuelven un resultado: no consultan la base de datos ni saben nada de
Flask. Así se pueden probar sueltas desde `flask shell`.

La regla, en corto: un trabajador está libre para una reserva si cada uno
de sus tramos cae en un día laborable suyo, cabe entero dentro de su turno
y no choca con sus otras reservas (contando 30 minutos de margen).

Las reservas se guardan en hora de Madrid sin zona, así que aquí todas las
fechas son de ese tipo: nunca se mezclan con fechas con zona.
"""

from datetime import datetime, timedelta


# Una reserva larga se reparte en tramos de, como mucho, esta duración:
# 12 h son dos días de 6 h. Es la jornada máxima de un trabajador.
MAX_HOURS_PER_DAY = 6

# Hueco entre dos reservas del mismo trabajador, para ir de una casa a otra.
TRAVEL_MARGIN = timedelta(minutes=30)

# Hasta dónde se buscan días laborables para los tramos de una reserva.
# Sin tope, un trabajador de baja indefinida haría buscar para siempre.
SEARCH_LIMIT_DAYS = 60


def split_into_days(hours):
    """Reparte las horas en tramos de un día: 9 -> [6, 3] · 12 -> [6, 6]."""
    full_days, rest = divmod(hours, MAX_HOURS_PER_DAY)
    return [MAX_HOURS_PER_DAY] * full_days + ([rest] if rest else [])


def can_work(worker):
    """Si se le puede reservar a alguien, sea el día que sea: trabajador y
    usuario activos, y con un turno que también lo esté."""
    return bool(
        worker.is_active
        and worker.user is not None
        and worker.user.is_active
        and worker.shift is not None
        and worker.shift.is_active
    )


def worker_unavailable_days(worker, first_day, last_day):
    """Días entre first_day y last_day (incluidos) en los que el trabajador
    no puede trabajar aunque sean de su turno.

    Hoy no hay ninguno: devuelve un conjunto vacío. La #15 la rellenará con
    las vacaciones y las bajas, y el resto del cálculo no tendrá que cambiar.
    """
    return set()


def working_days(worker, first_day, count):
    """Los `count` primeros días laborables del trabajador a partir de
    first_day (incluido). Un día es laborable si es de su turno y no está
    en worker_unavailable_days(). Si no se encuentran a tiempo, None.
    """
    last_day = first_day + timedelta(days=SEARCH_LIMIT_DAYS)
    unavailable = worker_unavailable_days(worker, first_day, last_day)
    shift_days = worker.shift.days

    found = []
    day = first_day

    while day <= last_day and len(found) < count:
        if day.isoweekday() in shift_days and day not in unavailable:
            found.append(day)
        day += timedelta(days=1)

    return found if len(found) == count else None


def booking_intervals(worker, start, hours):
    """Los tramos (inicio, fin) de una reserva de `hours` horas que empieza
    en `start`, o None si no encaja en el turno del trabajador.

    Todos los tramos empiezan a la misma hora, y el primero tiene que caer
    justo el día de `start`: si ese día no trabaja, no hay reserva.
    """
    if not can_work(worker):
        return None

    chunks = split_into_days(hours)
    days = working_days(worker, start.date(), len(chunks))

    if days is None or days[0] != start.date():
        return None

    shift = worker.shift
    intervals = []

    for day, chunk in zip(days, chunks):
        begins = datetime.combine(day, start.time())
        ends = begins + timedelta(hours=chunk)

        # Tiene que caber entero dentro del turno de ese día.
        if begins < datetime.combine(day, shift.start_time) or ends > datetime.combine(day, shift.end_time):
            return None

        intervals.append((begins, ends))

    return intervals


def is_free(intervals, busy):
    """Si ninguno de los tramos choca con las reservas que ya tiene el
    trabajador (`busy`, una lista de tramos (inicio, fin)).

    El margen se suma por los dos lados: entre el fin de una reserva y el
    inicio de la siguiente tiene que haber, al menos, TRAVEL_MARGIN.
    """
    for begins, ends in intervals:
        for busy_begins, busy_ends in busy:
            if begins < busy_ends + TRAVEL_MARGIN and busy_begins < ends + TRAVEL_MARGIN:
                return False

    return True