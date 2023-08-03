import mapAny from 'map-any'
import { isObject } from './is.js'

export default mapAny(function unwrapValue(value: unknown) {
  return isObject(value) && value.hasOwnProperty('$value')
    ? value.$value
    : value
})
