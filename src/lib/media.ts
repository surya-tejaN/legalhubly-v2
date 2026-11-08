/** True on tablet/desktop layouts (Tailwind `md`). */
export function isMdUp(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
}
