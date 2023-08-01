import mapTransform from 'map-transform'
import mapAny from 'map-any'
import { isReference } from './is.js'

const extractIdFromRef = (data: unknown) => (isReference(data) ? data.id : data)

export default async (
  item: unknown,
  field: string
): Promise<unknown | unknown[]> =>
  mapAny(extractIdFromRef, await mapTransform(field)(item))
