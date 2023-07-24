import mapAny from 'map-any'
import { nanoid } from 'nanoid'
import booleanFn from './castFns/boolean.js'
import dateFn from './castFns/date.js'
import integerFn from './castFns/integer.js'
import numberFn from './castFns/number.js'
import objectFn from './castFns/object.js'
import nonPrimitiveFn from './castFns/nonPrimitive.js'
import stringFn from './castFns/string.js'
import type { CastFns, CastFn, Shape, FieldDefinition } from './types.js'
import {
  isObject,
  isFieldDefinition,
  isShape,
  isNotNullOrUndefined,
} from '../utils/is.js'
import { ensureArray } from '../utils/array.js'

interface CastFnUnary {
  (isRev: boolean): (value: unknown) => unknown
}

function castFnFromType(type: string, castFns: CastFns) {
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
      return nonPrimitiveFn(type, castFns)
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

const unwrapValue = (value: unknown) =>
  isObject(value) && value.hasOwnProperty('$value') ? value.$value : value

function createFieldCast(
  def: FieldDefinition | Shape | string | undefined,
  castFns: CastFns
): CastFnUnary | undefined {
  if (isFieldDefinition(def)) {
    // Primivite type or reference
    if (def?.const !== undefined) {
      return () => () => def.const
    }
    const castFn = castFnFromType(removeArrayNotation(def.$type), castFns)
    return (isRev: boolean) =>
      function castValue(rawValue: unknown) {
        const value = unwrapValue(rawValue)
        return value === undefined ? def.default : castFn(value, isRev)
      }
  } else if (isShape(def)) {
    // Shape
    return createShapeCast(def, undefined, castFns)
  } else {
    return undefined
  }
}

const unwrapSingleArrayItem =
  (fn: (value: unknown) => unknown) => (value: unknown) =>
    Array.isArray(value) && value.length === 1 ? fn(value[0]) : fn(value)

const handleArray = (
  fn: CastFnUnary,
  isArrayExpected: boolean,
  type?: string
): CastFnUnary =>
  isArrayExpected
    ? (isRev) => (value) =>
        value === undefined ? undefined : ensureArray(value).map(fn(isRev)) // Ensure that an array is returned
    : type === 'unknown'
    ? (isRev) => fn(isRev) // Return 'unknown' fields as is
    : (isRev) => unwrapSingleArrayItem(fn(isRev)) // Unwrap only item in an array when we don't expect an array

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
  castFns: CastFns
) {
  const cast = createFieldCast(def, castFns)
  if (cast) {
    const type = typeFromDef(def)
    return handleArray(
      cast,
      hasArrayNotation(key) || hasArrayNotation(type),
      type
    )
  } else {
    return undefined
  }
}

const completeItemBeforeCast = (
  { id, createdAt, updatedAt, ...item }: Record<string, unknown>,
  shape: Shape,
  doGenerateId: boolean
): Record<string, unknown> => ({
  id: id ?? (doGenerateId ? nanoid() : null),
  ...item,
  ...getDates(shape, createdAt, updatedAt),
})

function createShapeCast(
  shape: Shape,
  type: string | undefined,
  castFns: CastFns,
  doGenerateId = false
) {
  const fields = Object.entries(shape)
    .map(([key, def]) => [
      removeArrayNotation(key),
      createCastFn(key, def, castFns),
    ])
    .filter(([, cast]) => cast !== undefined) as [
    key: string,
    cast: CastFnUnary
  ][]

  return (isRev: boolean) =>
    function castItem(rawItem: unknown) {
      if (isObject(rawItem)) {
        const item = completeItemBeforeCast(rawItem, shape, doGenerateId)
        return Object.fromEntries([
          ...fields.map(([key, cast]) => [key, cast(isRev)(item[key])]), // eslint-disable-line security/detect-object-injection
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
  castFns: CastFns = new Map(),
  doGenerateId = false
): CastFn {
  const castShape = createShapeCast(shape, type, castFns, doGenerateId)
  return function castItem(data, isRev = false) {
    const casted = mapAny(castShape(isRev), data)
    return Array.isArray(casted) ? casted.filter(isNotNullOrUndefined) : casted
  }
}
