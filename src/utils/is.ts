import {
  TypedData,
  Reference,
  Action,
  Response,
  Ident,
  IdentType,
} from '../types.js'
import type { ShapeDef, FieldDefinition } from '../schema/types.js'

const OK_STATUSES = ['ok', 'noaction', 'queued']

export const isObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === '[object Object]'

export const isDate = (value: unknown): value is Date =>
  Object.prototype.toString.call(value) === '[object Date]'

export const isEmptyObject = (value: unknown): value is object =>
  isObject(value) && Object.keys(value).length === 0

export const isTypedData = (value: unknown): value is TypedData =>
  isObject(value) && Object.prototype.hasOwnProperty.call(value, '$type')

export const isReference = (value: unknown): value is Reference =>
  isObject(value) && Object.prototype.hasOwnProperty.call(value, '$ref')

export const isShape = (value: unknown): value is ShapeDef =>
  isObject(value) && !Object.prototype.hasOwnProperty.call(value, '$type')

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

export const isOkStatus = (status?: string) =>
  typeof status === 'string' && OK_STATUSES.includes(status)

export const isOkResponse = (response?: Response): response is Response =>
  isOkStatus(response?.status)

export const isErrorResponse = (response?: Response) =>
  typeof response?.status === 'string' && !OK_STATUSES.includes(response.status)

export const isTruthy = (value: unknown): boolean => !!value
export const isFalsy = (value: unknown): boolean => !value
export const not = isFalsy

export const isDuplicate = <T = unknown>(
  error: T,
  index: number,
  errors: T[],
): boolean => errors.indexOf(error) === index

export const isCustomIdent = (ident?: Ident) =>
  (ident?.type === undefined || ident?.type === IdentType.Custom) &&
  !ident?.root

export const isInternalIdent = (ident?: Ident) => !isCustomIdent(ident)

export const isRootIdent = (ident?: Ident) =>
  ident?.type === IdentType.Root || ident?.root

export const isSchedulerIdent = (ident?: Ident) =>
  ident?.type === IdentType.Scheduler

export const isAnonIdent = (ident?: Ident) => ident?.type === IdentType.Anon
