import { pathGetter } from 'map-transform'
import mapAny from 'map-any'
import { isReference } from './is.js'

const extractIdFromRef = (data: unknown) => (isReference(data) ? data.id : data)

export default (
  item: unknown,
  path?: string | null,
  def: unknown = undefined,
): unknown | unknown[] =>
  typeof path === 'string' && path !== ''
    ? mapAny(
        extractIdFromRef,
        pathGetter(path)(item, { context: [], value: undefined }),
      )
    : def
