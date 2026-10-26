const BUSINESS_DAY_FORMATTER_CACHE = new Map();

function getFormatter(timeZone) {
  if (!BUSINESS_DAY_FORMATTER_CACHE.has(timeZone)) {
    BUSINESS_DAY_FORMATTER_CACHE.set(
      timeZone,
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      })
    );
  }
  return BUSINESS_DAY_FORMATTER_CACHE.get(timeZone);
}

function getZonedParts(date, timeZone) {
  return Object.fromEntries(
    getFormatter(timeZone)
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );
}

function localDateTimeToDate(parts, timeZone) {
  const desired = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour);
  let guess = desired;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = getZonedParts(new Date(guess), timeZone);
    const represented = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second
    );
    guess += desired - represented;
  }

  return new Date(guess);
}

export function getCurrentBusinessDayStart(now, timeZone = 'Africa/Addis_Ababa', startHour = 4) {
  const local = getZonedParts(now, timeZone);
  const hour = Math.max(0, Math.min(23, Number(startHour) || 0));
  const localDate = new Date(Date.UTC(local.year, local.month - 1, local.day));

  if (local.hour < hour) {
    localDate.setUTCDate(localDate.getUTCDate() - 1);
  }

  return localDateTimeToDate(
    {
      year: localDate.getUTCFullYear(),
      month: localDate.getUTCMonth() + 1,
      day: localDate.getUTCDate(),
      hour,
    },
    timeZone
  );
}

export function getNextBusinessDayStart(now, timeZone = 'Africa/Addis_Ababa', startHour = 4) {
  const currentStart = getCurrentBusinessDayStart(now, timeZone, startHour);
  const safelyNextDay = new Date(currentStart.getTime() + 36 * 60 * 60 * 1000);
  return getCurrentBusinessDayStart(safelyNextDay, timeZone, startHour);
}
