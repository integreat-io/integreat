import { castDate } from './builtIns/date'

export default () =>
  function ms(
    value: unknown,
    { rev }: { rev: boolean }
  ): number | Date | null | undefined {
    const date = castDate(value)

    if (rev) {
      return date instanceof Date ? date?.getTime() : undefined
    }

    return date || undefined
  }
