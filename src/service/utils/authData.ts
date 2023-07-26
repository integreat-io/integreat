import getField from '../../utils/getField.js'
import { arrayIncludes, filterAsync } from '../../utils/array.js'
import { isTypedData, isNullOrUndefined } from '../../utils/is.js'
import type { Action, TypedData, Ident } from '../../types.js'
import type Schema from '../../schema/Schema.js'

export interface AuthorizeDataFn {
  (action: Action, allowRaw?: boolean): Promise<Action>
}

const isStringOrArray = (value: unknown): value is string | string[] =>
  typeof value === 'string' || Array.isArray(value)

async function getValueAndCompare(
  item: TypedData,
  fieldPath: string,
  compareValue?: string | string[]
) {
  const values = await getField(item, fieldPath)
  return isStringOrArray(values) && arrayIncludes(compareValue, values)
}

const authorizeItem =
  (
    schemas: Record<string, Schema>,
    actionType: string,
    allowRaw: boolean,
    ident?: Ident
  ) =>
  async (item: unknown): Promise<string | undefined> => {
    if (!isTypedData(item)) {
      return allowRaw ? undefined : 'RAW_DATA'
    }
    const schema = schemas[item.$type]
    if (!schema) {
      return 'NO_SCHEMA'
    }
    const { identFromField, roleFromField } = schema.accessForAction(actionType)
    const validateIdent = typeof identFromField === 'string'
    const validateRole = typeof roleFromField === 'string'

    // Authorize when neither ident nor role should be validated
    if (!validateIdent && !validateRole) {
      return undefined
    }

    // Get validation results for the required methods
    const identResult =
      !validateIdent ||
      (await getValueAndCompare(item, identFromField, ident?.id))
    const roleResult =
      !validateRole ||
      (await getValueAndCompare(item, roleFromField, ident?.roles))

    // Authorize if either ident or role validation passes
    if (validateIdent && validateRole && (identResult || roleResult)) {
      return undefined
    }
    // We are supposed to validate by only one of the methods - do it
    return (
      (!identResult && 'WRONG_IDENT') ||
      (!roleResult && 'MISSING_ROLE') ||
      undefined
    )
  }

const generateWarning = (removedCount: number, isToService: boolean) =>
  removedCount > 0
    ? `${removedCount} item${
        removedCount === 1 ? ' was' : 's were'
      } removed from ${
        isToService ? 'request' : 'response'
      } data due to lack of access`
    : undefined

const generateErrorAndReason = (
  reason: string,
  data: unknown,
  isToService: boolean,
  service?: string
) =>
  reason === 'RAW_DATA'
    ? `Authentication was refused for raw ${
        isToService ? 'request' : 'response'
      } data${
        service ? ` ${isToService ? 'to' : 'from'} service '${service}'` : ''
      }`
    : `Authentication was refused for type '${(data as TypedData).$type}'${
        service ? ` on service '${service}'` : ''
      }`

async function getAuthedWithResponse(
  data: unknown,
  authFn: (item: unknown) => Promise<string | undefined>,
  isToService: boolean,
  service?: string
) {
  if (isNullOrUndefined(data)) {
    return { data }
  } else if (Array.isArray(data)) {
    const authed = await filterAsync(
      data,
      async (data: unknown) => (await authFn(data)) === undefined
    )
    const warning = generateWarning(data.length - authed.length, isToService)
    return { data: authed, warning }
  }

  const reason = await authFn(data)
  if (typeof reason === 'string') {
    const error = generateErrorAndReason(reason, data, isToService, service)
    return {
      data: undefined,
      status: 'noaccess',
      error,
      reason,
      origin: 'auth:data',
    }
  } else {
    return { data }
  }
}

const isError = (status?: string | null) =>
  typeof status === 'string' && status !== 'ok'

const authorizeDataBase = (
  schemas: Record<string, Schema>,
  isToService: boolean
) =>
  async function authorizeData(
    action: Action,
    allowRaw = false
  ): Promise<Action> {
    if (action.meta?.ident?.root) {
      return action
    }

    const {
      type: actionType,
      payload: { targetService },
      meta: { ident } = {},
    } = action
    const {
      data,
      status: authedStatus,
      error,
      reason,
      warning,
    } = await getAuthedWithResponse(
      isToService ? action.payload.data : action.response?.data,
      authorizeItem(schemas, actionType, allowRaw, ident),
      isToService,
      targetService
    )
    const status =
      isError(action.response?.status) || !authedStatus
        ? action.response?.status
        : authedStatus

    const response =
      status !== undefined || warning
        ? {
            ...action.response,
            ...(!isToService && { data }),
            ...(!action.response?.error && error && { error }),
            ...(!action.response?.error && reason && { reason }),
            ...(warning && { warning }),
            ...(isError(status)
              ? { origin: action.response?.origin || 'auth:data' }
              : {}),
            status,
          }
        : undefined

    return {
      ...action,
      payload: {
        ...action.payload,
        ...(isToService && { data }),
      },
      ...(response && { response }),
    }
  }

export const fromService = (schemas: Record<string, Schema>): AuthorizeDataFn =>
  authorizeDataBase(schemas, false)

export const toService = (schemas: Record<string, Schema>): AuthorizeDataFn =>
  authorizeDataBase(schemas, true)
