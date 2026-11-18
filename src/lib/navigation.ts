/** Menu aktif bila path sama persis atau berada di bawah prefix (mis. /pekerja/ABC-1 → Pekerja). */
export function isNavActive(pathname: string, item: { match: readonly string[] }) {
  return item.match.some((prefix) => prefix === "/" ? pathname === "/" : pathname === prefix || pathname.startsWith(`${prefix}/`));
}
