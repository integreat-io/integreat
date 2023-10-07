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

interface CastItemFn {
  (isRev: boolean, noDefaults: boolean): (value: unknown) => unknown
}

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

function createFieldCast(
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

function getDates(shape: Shape, createdAt: unknown, updatedAt: unknown) {
  const nextCreatedAt = shape.createdAt // Should have
    ? createdAt
      ? createdAt // Already has
      : updatedAt ?? new Date() // Use updatedAt or now
    : undefined
  const nextUpdatedAt = shape.updatedAt // Should have
    ? updatedAt
      ? updatedAt // Already has
      : nextCreatedAt ?? new Date() // createdAt or now
    : undefined

  return {
    ...(nextCreatedAt ? { createdAt: nextCreatedAt } : {}),
    ...(nextUpdatedAt ? { updatedAt: nextUpdatedAt } : {}),
  }
}

function createCastFn(
  key: string,
  def: FieldDefinition | Shape | string | undefined,
  schemas: Map<string, Schema>,
) {
  const cast = createFieldCast(def, schemas)
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

const completeItemBeforeCast = (
  { id, createdAt, updatedAt, ...item }: Record<string, unknown>,
  shape: Shape,
  doGenerateId: boolean,
  noDefaults: boolean,
): Record<string, unknown> => ({
  id: id ?? (doGenerateId && !noDefaults ? nanoid() : null),
  ...item,
  ...(noDefaults ? {} : getDates(shape, createdAt, updatedAt)),
})

const castField =
  (item: Record<string, unknown>, isRev: boolean, noDefaults: boolean) =>
  ([key, cast]: [string, CastItemFn]): [string, unknown] => [
    key,
    cast(isRev, noDefaults)(item[key]), // eslint-disable-line security/detect-object-injection
  ]

const fieldHasValue = ([_, value]: [string, unknown]) => value !== undefined

function createShapeCast(
  shape: Shape,
  type: string | undefined,
  schemas: Map<string, Schema>,
  doGenerateId = false,
) {
  const fields = Object.entries(shape)
    .map(([key, def]) => [
      removeArrayNotation(key),
      createCastFn(key, def, schemas),
    ])
    .filter(([, cast]) => cast !== undefined) as [
    key: string,
    cast: CastItemFn,
  ][]

  return (isRev: boolean, noDefaults: boolean) =>
    function castItem(rawItem: unknown) {
      if (isObject(rawItem)) {
        const item = completeItemBeforeCast(
          rawItem,
          shape,
          doGenerateId,
          noDefaults,
        )
        return Object.fromEntries([
          ...fields
            .map(castField(item, isRev, noDefaults))
            .filter(fieldHasValue),
          ...(!isRev && typeof type === 'string' ? [['$type', type]] : []),
          ...(item.isNew === true ? [['isNew', true]] : []),
          ...(item.isDeleted === true ? [['isDeleted', true]] : []),
        ])
      } else {
        return undefined
      }
    }
}

/**
 * Create a cast function for the given shape. Will cast both arrays of items
 * and single items. When casting arrays, null and undefined values will be
 * removed.
 */
export default function createCast(
  shape: Shape,
  type: string,
  schemas: Map<string, Schema> = new Map(),
  doGenerateId = false,
): CastFn {
  const castShape = createShapeCast(shape, type, schemas, doGenerateId)
  return function castItem(data, isRev = false, noDefaults = false) {
    const casted = mapAny(castShape(isRev, noDefaults), data)
    return Array.isArray(casted) ? casted.filter(isNotNullOrUndefined) : casted
  }
}
