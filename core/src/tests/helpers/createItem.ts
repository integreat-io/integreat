import { TypedData } from '../../types'

export default (
  id: string,
  type: string,
  shape = {},
  relationships = {}
): TypedData => ({
  id,
  $type: type,
  ...shape,
  ...relationships,
})
