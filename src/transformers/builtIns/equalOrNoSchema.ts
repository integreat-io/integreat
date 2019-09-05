import { Data } from '../../types'
import { isTypedData } from '../../utils/is'

interface Operands {
  type?: string
}

export default function equalOrNoSchema ({ type }: Operands) {
  return (data: Data) => !type || !isTypedData(data) || data.$type === type
}
