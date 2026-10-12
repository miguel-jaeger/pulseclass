export function formatDisplayName(name: string | null | undefined): string {
  return (name || '')
    .trim()
    .toLocaleLowerCase('es')
    .replace(/(^|[\s'-])\p{L}/gu, character => character.toLocaleUpperCase('es'))
}
