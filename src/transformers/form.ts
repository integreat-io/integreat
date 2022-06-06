/* eslint-disable security/detect-object-injection */
import { CustomFunction } from 'map-transform'
import { getFirstIfArray } from '../utils/array'
import { isObject, isDataObject } from '../utils/is'

const parseObject = (value: string) => {
  try {
    return JSON.parse(value)
  } catch (err) {
    return value
  }
}

const parseForm = (data: unknown) =>
  typeof data === 'string'
    ? data
        .split('&')
        .map((pair) => pair.split('='))
        .map(([key, value]) => ({
          [key]:
            typeof value === 'undefined'
              ? undefined
              : parseObject(decodeURIComponent(value).replace(/\+/g, ' ')),
        }))
        .reduce((object, pair) => ({ ...object, ...pair }), {})
    : null

const formatObject = (value: unknown) =>
  isObject(value) ? JSON.stringify(value) : String(value)
const formatValue = (value: unknown) =>
  encodeURIComponent(formatObject(value)).replace(/%20/g, '+')

const stringifyForm = (data: unknown) =>
  isDataObject(data)
    ? Object.keys(data)
        .map((key: string) =>
          typeof data[key] === 'undefined'
            ? key
            : `${key}=${formatValue(data[key])}`
        )
        .join('&')
    : null

const form: CustomFunction = (_operands, _options) => (data, state) =>
  state.rev ? stringifyForm(getFirstIfArray(data)) : parseForm(data)

export default form
