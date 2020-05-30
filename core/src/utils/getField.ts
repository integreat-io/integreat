import { path } from 'ramda'
import mapAny = require('map-any')
import { isReference } from './is'
import { Data } from '../types'

const extractIdFromRef = (data: Data) =>
  isReference(data) ? data.id : data

const extractFromPath = (data: Data, fieldPath: string) =>
  (data && fieldPath && path(fieldPath.split('.'), data)) || undefined

export default (item: Data, field: string) =>
  mapAny(extractIdFromRef, extractFromPath(item, field))
