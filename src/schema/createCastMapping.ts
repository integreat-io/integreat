import mapAny = require('map-any')
import {
  transform,
  fwd,
  rev,
  filter,
  ifelse,
  apply,
  iterate,
} from 'map-transform'
import {
  isObject,
  isShape,
  isFieldDefinition,
  isDataObject,
  isNullOrUndefined,
} from '../utils/is.js'
import { ensureArrayOrUndefined } from '../utils/array.js'
import type {
  TransformDefinition,
  TransformObject,
  Pipeline,
} from 'map-transform/types.js'
import type { Shape, FieldDefinition } from './types.js'

const primitiveTypes = [
  'string',
  'integer',
  'number',
  'boolean',
  'date',
  'object',
]

const typeFromDef = (prop?: string | FieldDefinition) =>
  isFieldDefinition(prop) ? prop.$cast : prop

const defaultFromProp = (prop?: string | FieldDefinition) => {
  if (isFieldDefinition(prop)) {
    if (prop.hasOwnProperty('$const')) {
      return [{ $transform: 'fixed', value: prop.$const }]
    } else if (prop.hasOwnProperty('$default')) {
      return [{ $alt: [{ $value: prop.$default }] }]
    }
  }
  return []
}

const unarray = (type: string, isArray: boolean) =>
  isArray || type === 'unknown' ? [] : [{ $transform: 'unarray' }]

const hasArrayNotation = (value: string) => value.endsWith('[]')

const removeArrayNotation = (key: string) =>
  hasArrayNotation(key)
    ? ([key.slice(0, key.length - 2), true] as const)
    : ([key, false] as const)

const isRef = (type: string) => (value: unknown) => {
  if (!isObject(value)) {
    return true
  }
  const noOfKeys = Object.keys(value).length
  return (
    !!value.id && (noOfKeys === 1 || (noOfKeys === 2 && value.$ref === type))
  )
}

const transformFromType = (type: string) => {
  if (primitiveTypes.includes(type)) {
    return [{ $transform: type }]
  } else if (type === 'float') {
    return [{ $transform: 'number' }]
  } else if (type === 'unknown') {
    return []
  } else {
    return [
      iterate(
        ifelse(
          isRef(type),
          { $transform: 'reference', type },
          apply(`cast_${type}`)
        )
      ),
    ]
  }
}

const generateFieldPipeline = (
  field: string,
  isArray: boolean,
  pipeline: Pipeline
) => ({
  [field]: [
    field,
    isArray ? rev(transform(() => ensureArrayOrUndefined)) : undefined,
    ...pipeline,
    isArray ? fwd(transform(() => ensureArrayOrUndefined)) : undefined,
  ].filter(Boolean),
})

const mutationObjectFromShape = (
  shape: Shape,
  iterate = false
): TransformObject =>
  Object.entries(shape).reduce(
    (mutation, [field, def]) => {
      const [realField, isFieldArray] = removeArrayNotation(field)

      if (isShape(def)) {
        return {
          ...mutation,
          ...generateFieldPipeline(realField, isFieldArray, [
            mutationObjectFromShape(def, hasArrayNotation(field)),
          ]),
        }
      }

      const type = typeFromDef(def)
      if (typeof type !== 'string') {
        return mutation
      }

      const [realType, isTypeArray] = removeArrayNotation(type)
      const isArray = isTypeArray || isFieldArray

      return {
        ...mutation,
        ...generateFieldPipeline(realField, isArray, [
          ...unarray(realType, isArray),
          ...defaultFromProp(def),
          ...transformFromType(realType),
        ]),
      }
    },
    iterate ? { $iterate: true } : {}
  )

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

const cleanUpCast = (type: string, shape: Shape, isFwd: boolean) => () =>
  mapAny((item: unknown) => {
    if (isDataObject(item)) {
      const {
        $type,
        $ref,
        createdAt,
        updatedAt,
        isNew,
        isDeleted,
        id,
        ...fields
      } = item
      return {
        id,
        ...(isFwd && { $type: type }),
        ...fields,
        ...getDates(shape, createdAt, updatedAt),
        ...(isNew === true ? { isNew } : {}),
        ...(isDeleted === true ? { isDeleted } : {}),
      }
    } else {
      return item
    }
  })

export default function createCastMapping(
  shape: Shape,
  type: string
): TransformDefinition {
  const filterItem = filter(() => (data: unknown) => !isNullOrUndefined(data))
  const mutationObject = mutationObjectFromShape(shape, true) // true to get $iterate

  return [
    fwd(filterItem),
    rev(transform(cleanUpCast(type, shape, false))),
    {
      ...mutationObject,
      isNew: ['isNew', { $transform: 'boolean' }],
      isDeleted: ['isDeleted', { $transform: 'boolean' }],
    },
    fwd(transform(cleanUpCast(type, shape, true))),
    rev(filterItem),
  ]
}
