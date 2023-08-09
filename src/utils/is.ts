import type { TypedData, Reference, Action, Response } from '../types.js'
import type { ShapeDef, FieldDefinition } from '../schema/types.js'

const OK_STATUSES = ['ok', 'noaction', 'queued']

export const isObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === '[object Object]'

export const isDate = (value: unknown): value is Date =>
  Object.prototype.toString.call(value) === '[object Date]'

// eslint-disable-next-line @typescript-eslint/ban-types
export const isEmptyObject = (value: unknown): value is {} =>
  isObject(value) && Object.keys(value).length === 0

export const isTypedData = (value: unknown): value is TypedData =>
  isObject(value) && value.hasOwnProperty('$type')

export const isReference = (value: unknown): value is Reference =>
  isObject(value) && value.hasOwnProperty('$ref')

export const isShape = (value: unknown): value is ShapeDef =>
  isObject(value) && !value.hasOwnProperty('$type')

export const isFieldDefinition = (value: unknown): value is FieldDefinition =>
  isObject(value) && typeof value.$type === 'string'

export const isNullOrUndefined = (value: unknown): value is null | undefined =>
  value === null || value === undefined

export const isNotNullOrUndefined = <T>(value: T): value is NonNullable<T> =>
  !isNullOrUndefined(value)

export const isAction = (action: unknown): action is Action =>
  isObject(action) &&
  typeof action.type === 'string' &&
  isObject(action.payload)

export const isOkResponse = (response?: Response) =>
  typeof response?.status === 'string' && OK_STATUSES.includes(response.status)

export const isErrorResponse = (response?: Response) =>
  typeof response?.status === 'string' && !OK_STATUSES.includes(response.status)

export const isTruthy = (value: unknown): boolean => !!value
export const isFalsy = (value: unknown): boolean => !value
export const not = isFalsy

export const isDuplicate = <T = unknown>(
  error: T,
  index: number,
  errors: T[]
): boolean => errors.indexOf(error) === index
