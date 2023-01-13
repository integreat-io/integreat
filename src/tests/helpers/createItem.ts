import { TypedData } from '../../types.js'

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
