import mapAny from 'map-any'
import { nanoid } from 'nanoid'
import booleanFn from './castFns/boolean.js'
import dateFn from './castFns/date.js'
import integerFn from './castFns/integer.js'
import numberFn from './castFns/number.js'
import objectFn from './castFns/object.js'
import nonPrimitiveFn from './castFns/nonPrimitive.js'
import stringFn from './castFns/string.js'
import {
  isObject,
  isFieldDefinition,
  isShape,
  isNotNullOrUndefined,
} from '../utils/is.js'
import unwrapValue from '../utils/unwrapValue.js'
import { ensureArray } from '../utils/array.js'
import type Schema from './Schema.js'
import type { CastFn, Shape, FieldDefinition } from './types.js'

type CastItemFn = (
  isRev: boolean,
  noDefaults: boolean,
) => (value: unknown) => unknown

function castFnFromType(type: string, schemas: Map<string, Schema>) {
  switch (type) {
    case 'string':
      return stringFn
    case 'integer':
      return integerFn
    case 'number':
    case 'float':
      return numberFn
    case 'boolean':
      return booleanFn
    case 'date':
      return dateFn
    case 'object':
      return objectFn
    case 'unknown':
      return (value: unknown) => value
    default:
      return nonPrimitiveFn(type, schemas)
  }
}

const typeFromDef = (prop?: string | FieldDefinition | Shape) =>
  isFieldDefinition(prop)
    ? prop.$type
    : typeof prop === 'string'
      ? prop
      : undefined

const hasArrayNotation = (key?: string) =>
  typeof key === 'string' && key.endsWith('[]')

const removeArrayNotation = (key: string) =>
  hasArrayNotation(key) ? key.slice(0, key.length - 2) : key

function createCastFn(
  def: FieldDefinition | Shape | string | undefined,
  schemas: Map<string, Schema>,
): CastItemFn | undefined {
  if (isFieldDefinition(def)) {
    // Primivite type or reference
    if (def?.const !== undefined) {
      return () => () => def.const
    }
    const castFn = castFnFromType(removeArrayNotation(def.$type), schemas)
    return (isRev: boolean, noDefaults = false) =>
      function castValue(rawValue: unknown) {
        const value = unwrapValue(rawValue)
        if (value === undefined) {
          return noDefaults ? undefined : def.default
        } else {
          return castFn(value, isRev)
        }
      }
  } else if (isShape(def)) {
    // Shape
    return createShapeCast(def, undefined, schemas)
  } else {
    return undefined
  }
}

const unwrapSingleArrayItem =
  (fn: (value: unknown) => unknown) => (value: unknown) =>
    Array.isArray(value) && value.length === 1 ? fn(value[0]) : fn(value)

const handleArray = (
  fn: CastItemFn,
  isArrayExpected: boolean,
  type?: string,
): CastItemFn =>
  isArrayExpected
    ? (isRev, noDefaults) => (value) =>
        value === undefined
          ? undefined
          : ensureArray(value).map(fn(isRev, noDefaults)) // Ensure that an array is returned
    : type === 'unknown'
      ? (isRev, noDefaults) => fn(isRev, noDefaults) // Return 'unknown' fields as is
      : (isRev, noDefaults) => unwrapSingleArrayItem(fn(isRev, noDefaults)) // Unwrap only item in an array when we don't expect an array

function getDates(
  shouldHaveCreatedAt: boolean,
  shouldHaveUpdatedAt: boolean,
  createdAt: unknown,
  updatedAt: unknown,
  noDefaults: boolean,
) {
  if (noDefaults) {
    return {}
  }

  const nextCreatedAt = shouldHaveCreatedAt
    ? createdAt
      ? createdAt // Already has
      : (updatedAt ?? new Date()) // Use updatedAt or now
    : undefined
  const nextUpdatedAt = shouldHaveUpdatedAt
    ? updatedAt
      ? updatedAt // Already has
      : (nextCreatedAt ?? new Date()) // createdAt or now
    : undefined

  return {
    ...(nextCreatedAt ? { createdAt: nextCreatedAt } : {}),
    ...(nextUpdatedAt ? { updatedAt: nextUpdatedAt } : {}),
  }
}

function createCastFnHandlingArrays(
  key: string,
  def: FieldDefinition | Shape | string | undefined,
  schemas: Map<string, Schema>,
) {
  const cast = createCastFn(def, schemas)
  if (cast) {
    const type = typeFromDef(def)
    return handleArray(
      cast,
      hasArrayNotation(key) || hasArrayNotation(type),
      type,
    )
  } else {
    return undefined
  }
}

const completeItemBeforeCast =
  (
    shouldHaveCreatedAt: boolean,
    shouldHaveUpdatedAt: boolean,
    doGenerateId: boolean,
  ) =>
  (
    item: Record<string, unknown>,
    noDefaults: boolean,
  ): Record<string, unknown> => ({
    ...item,
    id: item.id ?? (doGenerateId && !noDefaults ? nanoid() : null),
    ...getDates(
      shouldHaveCreatedAt,
      shouldHaveUpdatedAt,
      item.createdAt,
      item.updatedAt,
      noDefaults,
    ),
  })

const castField =
  (item: Record<string, unknown>, isRev: boolean, noDefaults: boolean) =>
  ([key, cast]: [string, CastItemFn]): [string, unknown] => [
    key,
    cast(isRev, noDefaults)(item[key]), // eslint-disable-line security/detect-object-injection
  ]

const fieldHasValue = ([_, value]: [string, unknown]) => value !== undefined

const createFieldCast =
  (schemas: Map<string, Schema>) =>
  ([key, def]: [string, FieldDefinition | Shape]): [
    string,
    CastItemFn | undefined,
  ] => [removeArrayNotation(key), createCastFnHandlingArrays(key, def, schemas)]

const entryHasCastFn = (
  entry: [string, CastItemFn | undefined],
): entry is [string, CastItemFn] => entry[1] !== undefined

const includeType = (isRev: boolean, type?: string) =>
  !isRev && typeof type === 'string' ? [['$type', type]] : []

const includeIsNewAndIsDeleted = (item: Record<string, unknown>) => [
  ...(item.isNew === true ? [['isNew', true]] : []),
  ...(item.isDeleted === true ? [['isDeleted', true]] : []),
]

const createCastItemFn =
  (
    completeItem: ReturnType<typeof completeItemBeforeCast>,
    fields: [string, CastItemFn][],
    type?: string,
  ) =>
  (isRev: boolean, noDefaults: boolean) =>
    function castItem(rawItem: unknown) {
      if (!isObject(rawItem)) {
        return undefined
      }

      const item = completeItem(rawItem, noDefaults)
      return Object.fromEntries([
        ...fields.map(castField(item, isRev, noDefaults)).filter(fieldHasValue),
        ...includeType(isRev, type),
        ...includeIsNewAndIsDeleted(item),
      ])
    }

function createShapeCast(
  shape: Shape,
  type: string | undefined,
  schemas: Map<string, Schema>,
  doGenerateId = false,
) {
  const fields = Object.entries(shape)
    .map(createFieldCast(schemas))
    .filter(entryHasCastFn)
  const shouldHaveCreatedAt = !!shape.createdAt
  const shouldHaveUpdatedAt = !!shape.updatedAt
  const completeItem = completeItemBeforeCast(
    shouldHaveCreatedAt,
    shouldHaveUpdatedAt,
    doGenerateId,
  )

  return createCastItemFn(completeItem, fields, type)
}

/**
 * Create a cast function for the given shape. Will cast both arrays of items
 * and single items. When casting arrays, null and undefined values will be
 * removed.
 */
export default function createCast(
  shape: Shape,
  type: string,
  schemas: Map<string, Schema> = new Map<string, Schema>(),
  doGenerateId = false,
): CastFn {
  const castShape = createShapeCast(shape, type, schemas, doGenerateId)
  return function castItem(data, isRev = false, noDefaults = false) {
    const casted = mapAny(castShape(isRev, noDefaults), data)
    return Array.isArray(casted) ? casted.filter(isNotNullOrUndefined) : casted
  }
}
