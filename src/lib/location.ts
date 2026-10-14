/** Launch market — Chicago only until more cities are enabled. */
export const LAUNCH_CITY = "Chicago";
export const LAUNCH_STATE = "IL";
export const LAUNCH_CITY_LABEL = "Chicago, IL";

export function isLaunchCity(city: string | null | undefined): boolean {
  return (city || "").trim().toLowerCase() === LAUNCH_CITY.toLowerCase();
}

export function normalizeToLaunchCity(_city?: string | null): string {
  return LAUNCH_CITY;
}
