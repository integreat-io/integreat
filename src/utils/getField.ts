import mapTransform from 'map-transform'
import mapAny = require('map-any')
import { isReference } from './is.js'

const extractIdFromRef = (data: unknown) => (isReference(data) ? data.id : data)

export default (item: unknown, field: string): unknown | unknown[] =>
  mapAny(extractIdFromRef, mapTransform(field)(item))
