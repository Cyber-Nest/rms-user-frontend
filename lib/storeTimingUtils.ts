export interface StoreTiming {
  day: string;
  startTime: string;
  endTime: string;
  isHoliday: string; // 'Yes' | 'No'
}

export interface BranchStoreSettings {
  mainSettings?: {
    isEmergencyClosed?: boolean;
    timezone?: string;
  };
  taxFeesSettings?: {
    deliveryFee?: number;
    gstTaxRate?: number;
    pstTaxRate?: number;
    hstTaxRate?: number;
  };
  storeTimings?: StoreTiming[];
  storeTimingsUpdates?: any[];
  holidays?: any[];
}

export interface BranchWithSettings {
  _id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  openingHours?: string;
  isActive: boolean;
  settings?: BranchStoreSettings;
}

// ── Alberta Timezone Helpers ──────────────────────────────────────────────────
const ALBERTA_TZ = "America/Edmonton";

/**
 * Returns current date/time parts in Alberta (America/Edmonton) timezone.
 * Avoids relying on browser's local timezone (could be IST, UTC, etc.).
 */
function getAlbertaNow(): { dayName: string; hours: number; minutes: number; dateStr: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ALBERTA_TZ,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const dayName = get("weekday");
  const hours = parseInt(get("hour"), 10);
  const minutes = parseInt(get("minute"), 10);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const dateStr = `${year}-${month}-${day}`;

  return { dayName, hours, minutes, dateStr };
}
// ─────────────────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function parse12HourTime(timeStr: string): {
  hours: number;
  minutes: number;
} {
  if (!timeStr) return { hours: 10, minutes: 0 };
  const cleaned = timeStr.trim().toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return { hours: 10, minutes: 0 };

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3];

  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}

export function getTodayBranchSchedule(branch: BranchWithSettings | null) {
  const { dayName } = getAlbertaNow();

  if (
    !branch ||
    !branch.settings ||
    !Array.isArray(branch.settings.storeTimings)
  ) {
    return {
      day: dayName,
      startTime: "10:00 AM",
      endTime: "09:00 PM",
      isHoliday: "No",
      isEmergencyClosed: !!branch?.settings?.mainSettings?.isEmergencyClosed,
    };
  }

  const todaySchedule = branch.settings.storeTimings.find(
    (st) => st.day && st.day.toLowerCase() === dayName.toLowerCase(),
  );

  return {
    day: dayName,
    startTime: todaySchedule?.startTime || "10:00 AM",
    endTime: todaySchedule?.endTime || "09:00 PM",
    isHoliday: todaySchedule?.isHoliday || "No",
    isEmergencyClosed: !!branch.settings?.mainSettings?.isEmergencyClosed,
  };
}

export function isBranchCurrentlyOpen(branch: BranchWithSettings | null): {
  isOpen: boolean;
  reason: string;
  scheduleText: string;
  startTimeStr: string;
  endTimeStr: string;
  isBeforeOpening: boolean;
  isAfterClosing: boolean;
} {
  if (!branch) {
    return {
      isOpen: false,
      reason: "No branch selected",
      scheduleText: "10:00 AM - 09:00 PM",
      startTimeStr: "10:00 AM",
      endTimeStr: "09:00 PM",
      isBeforeOpening: false,
      isAfterClosing: false,
    };
  }

  const schedule = getTodayBranchSchedule(branch);
  const scheduleText = `${schedule.startTime} - ${schedule.endTime}`;

  if (!branch.isActive) {
    return {
      isOpen: false,
      reason: "Branch inactive",
      scheduleText,
      startTimeStr: schedule.startTime,
      endTimeStr: schedule.endTime,
      isBeforeOpening: false,
      isAfterClosing: false,
    };
  }

  if (schedule.isEmergencyClosed) {
    return {
      isOpen: false,
      reason: "Closed Today",
      scheduleText,
      startTimeStr: schedule.startTime,
      endTimeStr: schedule.endTime,
      isBeforeOpening: false,
      isAfterClosing: false,
    };
  }

  if (schedule.isHoliday === "Yes") {
    return {
      isOpen: false,
      reason: "Closed for Holiday",
      scheduleText,
      startTimeStr: schedule.startTime,
      endTimeStr: schedule.endTime,
      isBeforeOpening: false,
      isAfterClosing: false,
    };
  }

  const { hours: currentHours, minutes: currentMinutes } = getAlbertaNow();
  const currentTotalMins = currentHours * 60 + currentMinutes;

  const startParsed = parse12HourTime(schedule.startTime);
  const startTotalMins = startParsed.hours * 60 + startParsed.minutes;

  const endParsed = parse12HourTime(schedule.endTime);
  const endTotalMins = endParsed.hours * 60 + endParsed.minutes;

  if (currentTotalMins < startTotalMins) {
    return {
      isOpen: false,
      reason: `Opens at ${schedule.startTime}`,
      scheduleText,
      startTimeStr: schedule.startTime,
      endTimeStr: schedule.endTime,
      isBeforeOpening: true,
      isAfterClosing: false,
    };
  }

  if (currentTotalMins >= endTotalMins) {
    return {
      isOpen: false,
      reason: `Closed for today (Closed at ${schedule.endTime})`,
      scheduleText,
      startTimeStr: schedule.startTime,
      endTimeStr: schedule.endTime,
      isBeforeOpening: false,
      isAfterClosing: true,
    };
  }

  return {
    isOpen: true,
    reason: "Open Now",
    scheduleText,
    startTimeStr: schedule.startTime,
    endTimeStr: schedule.endTime,
    isBeforeOpening: false,
    isAfterClosing: false,
  };
}

export function generateValidTimeSlotsForBranch(
  branch: BranchWithSettings | null,
  selectedDateStr: string,
): string[] {
  const schedule = getTodayBranchSchedule(branch);
  const slots: string[] = [];

  const startParsed = parse12HourTime(schedule.startTime);
  const endParsed = parse12HourTime(schedule.endTime);

  const { dateStr: todayStr, hours: nowHours, minutes: nowMinutes } = getAlbertaNow();

  // Alberta current time as minutes-since-midnight
  const nowTotalMins = nowHours * 60 + nowMinutes;

  let startTime = { hours: 0, minutes: 0 }; // will be set below

  if (selectedDateStr === todayStr) {
    // Current Alberta time + 1 hour prep buffer (60 mins)
    let minTotalMins = nowTotalMins + 60;

    // Earliest time slot is 1 hour AFTER store opening time
    const storeEarliestMins = (startParsed.hours + 1) * 60 + startParsed.minutes;

    if (minTotalMins < storeEarliestMins) {
      minTotalMins = storeEarliestMins;
    }

    // Round minutes up to next 15-minute interval
    const totalMinHours = Math.floor(minTotalMins / 60);
    const totalMinMins = minTotalMins % 60;
    const roundedMins = Math.ceil(totalMinMins / 15) * 15;
    if (roundedMins >= 60) {
      startTime = { hours: totalMinHours + 1, minutes: 0 };
    } else {
      startTime = { hours: totalMinHours, minutes: roundedMins };
    }
  } else {
    // Future date: slots start 1 hour after opening time
    startTime = { hours: startParsed.hours + 1, minutes: startParsed.minutes };
  }

  const endTime = { hours: endParsed.hours, minutes: endParsed.minutes };

  // Generate 15-minute slots
  let curHours = startTime.hours;
  let curMins = startTime.minutes;
  const endTotalMins = endTime.hours * 60 + endTime.minutes;

  while (curHours * 60 + curMins < endTotalMins) {
    const ampm = curHours >= 12 ? "PM" : "AM";
    const displayHours = curHours % 12 === 0 ? 12 : curHours % 12;
    const displayMins = curMins < 10 ? `0${curMins}` : String(curMins);
    slots.push(`${displayHours}:${displayMins} ${ampm}`);

    curMins += 15;
    if (curMins >= 60) {
      curMins -= 60;
      curHours += 1;
    }
  }

  return slots;
}
