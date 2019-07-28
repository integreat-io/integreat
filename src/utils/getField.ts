import { path } from 'ramda'
import mapAny = require('map-any')
import { isReference } from './is'
import { GenericData } from '../types'

const extractIdFromRef = (data: GenericData) =>
  isReference(data) ? data.id : data

const extractFromPath = (data: GenericData, fieldPath: String) =>
  (data && fieldPath && path(fieldPath.split('.'), data)) || undefined

export default (item: GenericData, field: string) =>
  mapAny(extractIdFromRef, extractFromPath(item, field))
