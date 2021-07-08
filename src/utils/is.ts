import { DataObject, TypedData, Reference, Action } from '../types'
import { Shape, PropertyShape } from '../schema/types'

export const isObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === '[object Object]'

export const isDate = (value: unknown): value is Date =>
  Object.prototype.toString.call(value) === '[object Date]'

// eslint-disable-next-line @typescript-eslint/ban-types
export const isEmptyObject = (value: unknown): value is {} =>
  isObject(value) && Object.keys(value).length === 0

export const isDataObject = (value: unknown): value is DataObject =>
  isObject(value)

export const isTypedData = (value: unknown): value is TypedData =>
  isDataObject(value) && value.hasOwnProperty('$type')

export const isReference = (value: unknown): value is Reference =>
  isDataObject(value) && value.hasOwnProperty('$ref')

export const isSchema = (value: unknown): value is Shape =>
  isDataObject(value) && !value.hasOwnProperty('$cast')

export const isPropertySchema = (value: unknown): value is PropertyShape =>
  isDataObject(value) && value.hasOwnProperty('$cast')

export const isNullOrUndefined = (value: unknown): value is null | undefined =>
  value === null || value === undefined

export const isNotNullOrUndefined = <T>(value: T): value is NonNullable<T> =>
  !isNullOrUndefined(value)

export const isAction = (action: unknown): action is Action =>
  isDataObject(action) &&
  typeof action.type === 'string' &&
  isDataObject(action.payload)

export const isTruthy = (value: unknown): boolean => !!value
export const isFalsy = (value: unknown): boolean => !value
export const not = isFalsy
