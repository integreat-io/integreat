import dotProp = require('dot-prop')
import mapAny = require('map-any')
import { isReference, isObject } from './is'

const extractIdFromRef = (data: unknown) => (isReference(data) ? data.id : data)

const extractFromPath = (data: unknown, fieldPath: string) =>
  (fieldPath && isObject(data) && dotProp.get(data, fieldPath)) || undefined

export default (item: unknown, field: string): unknown | unknown[] =>
  mapAny(extractIdFromRef, extractFromPath(item, field))
