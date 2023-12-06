import { pathGetter } from 'map-transform'
import mapAny from 'map-any'
import { isReference } from './is.js'

// `pathGetter` is requiring state, so give the minimal state needed
const state = { context: [], value: undefined }

const extractIdFromRef = (data: unknown) => (isReference(data) ? data.id : data)

export default (item: unknown, field: string): unknown | unknown[] =>
  mapAny(extractIdFromRef, pathGetter(field)(item, state))
