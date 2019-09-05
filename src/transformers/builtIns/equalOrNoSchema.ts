import { GenericData } from '../../types'
import { isCastedData } from '../../utils/is'

interface Operands {
  type?: string
}

export default function equalOrNoSchema ({ type }: Operands) {
  return (data: GenericData) => !type || !isCastedData(data) || data.$type === type
}
