import { validateByRole, validateByIdent } from './authAction.js'
import getField from '../../utils/getField.js'
import { arrayIncludes, filterAsync } from '../../utils/array.js'
import { isTypedData, isNullOrUndefined } from '../../utils/is.js'
import type { Action, TypedData, Ident } from '../../types.js'
import type Schema from '../../schema/Schema.js'
import type { Access } from '../../schema/types.js'

export interface AuthorizeDataFn {
  (action: Action, allowRaw?: boolean): Promise<Action>
}

const isStringOrArray = (value: unknown): value is string | string[] =>
  typeof value === 'string' || Array.isArray(value)

async function getValueAndCompare(
  item: TypedData,
  fieldPath: string,
  compareValue?: string | string[],
) {
  const values = await getField(item, fieldPath)
  return isStringOrArray(values) && arrayIncludes(compareValue, values)
}

const isIdentFromFieldOk = async (
  item: TypedData,
  access: Access,
  ident?: Ident,
) =>
  access.identFromField &&
  (await getValueAndCompare(item, access.identFromField, ident?.id))

const isRoleFromFieldOk = async (
  item: TypedData,
  access: Access,
  ident?: Ident,
) =>
  access.roleFromField &&
  (await getValueAndCompare(item, access.roleFromField, ident?.roles))

const isItemAuthorized = async (
  item: TypedData,
  access: Access,
  ident?: Ident,
) =>
  (!access.identFromField && !access.roleFromField) || // No data based auth required
  validateByRole(access, ident) || // We are authorized by role
  validateByIdent(access, ident) || // We are authorized by ident
  (await isIdentFromFieldOk(item, access, ident)) || // We are authorized by identFromField, or it's not needed
  (await isRoleFromFieldOk(item, access, ident)) // We are authorized by roleFromField, or it's not needed

const authorizeItem =
  (
    schemas: Map<string, Schema>,
    actionType: string,
    allowRaw: boolean,
    ident?: Ident,
  ) =>
  async (item: unknown): Promise<string | undefined> => {
    if (!isTypedData(item)) {
      return allowRaw ? undefined : 'RAW_DATA'
    }
    const schema = schemas.get(item.$type)
    if (!schema) {
      return 'NO_SCHEMA'
    }

    const access = schema.accessForAction(actionType)
    if (await isItemAuthorized(item, access, ident)) {
      // We either are already authorized trough `role` or `ident`, we have no
      // `identFromField` or `roleFromField`, or we have are authorized by one
      // of them
      return undefined
    } else if (access.identFromField) {
      // We have `identFromField`, but it did not match. We might also have a
      // problem with role.
      return 'WRONG_IDENT'
    } else {
      // We have a `roleFromField`, but it did not match.
      return 'MISSING_ROLE'
    }
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
  service?: string,
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
  authItemFn: (item: unknown) => Promise<string | undefined>,
  isToService: boolean,
  service?: string,
) {
  if (isNullOrUndefined(data)) {
    return { data }
  } else if (Array.isArray(data)) {
    const authed = await filterAsync(
      data,
      async (data: unknown) => (await authItemFn(data)) === undefined,
    )
    const warning = generateWarning(data.length - authed.length, isToService)
    return { data: authed, warning }
  } else {
    const reason = await authItemFn(data)
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
}

const isError = (status?: string | null) =>
  typeof status === 'string' && status !== 'ok'

const authorizeDataBase = (
  schemas: Map<string, Schema>,
  isToService: boolean,
) =>
  async function authorizeData(
    action: Action,
    allowRaw = false,
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
      targetService,
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

export const fromService = (schemas: Map<string, Schema>): AuthorizeDataFn =>
  authorizeDataBase(schemas, false)

export const toService = (schemas: Map<string, Schema>): AuthorizeDataFn =>
  authorizeDataBase(schemas, true)
