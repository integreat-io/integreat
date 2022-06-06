export interface Operands {
  precision?: number
}

const roundByFactor = (value: number, factor: number) =>
  (Math.round(Math.abs(value * factor)) / factor) * Math.sign(value)

const getNumber = (value: unknown): number | undefined =>
  typeof value === 'number'
    ? value
    : typeof value === 'string'
    ? Number.parseFloat(value)
    : undefined

export default function round({
  precision,
}: Operands): (value: unknown, state: unknown) => number | undefined {
  const factor = 10 ** (precision ?? 0)
  return function round(value) {
    const number = getNumber(value)
    return typeof number === 'number' && !Number.isNaN(number)
      ? roundByFactor(number, factor)
      : undefined
  }
}
