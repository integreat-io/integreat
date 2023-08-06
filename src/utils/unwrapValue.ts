import mapAny from 'map-any'
import { isObject } from './is.js'

function unwrapValue(value: unknown): unknown {
  return isObject(value) && value.hasOwnProperty('$value')
    ? value.$value
    : value
}

export default (value: unknown) => mapAny(unwrapValue, value)
