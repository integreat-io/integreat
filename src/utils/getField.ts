import { path } from 'ramda'
import mapAny = require('map-any')
import { isReference } from './is'

const extractIdFromRef = (data: unknown) => (isReference(data) ? data.id : data)

const extractFromPath = (data: unknown, fieldPath: string) =>
  (data && fieldPath && path(fieldPath.split('.'), data)) || undefined

export default (item: unknown, field: string): unknown | unknown[] =>
  mapAny(extractIdFromRef, extractFromPath(item, field))
