import mapAny = require('map-any')
import {
  MapObject,
  MapDefinition,
  transform,
  fwd,
  rev,
  filter,
} from 'map-transform'
import { Shape, PropertyShape } from './types'
import {
  isSchema,
  isPropertySchema,
  isDataObject,
  isTypedData,
  isNullOrUndefined,
} from '../utils/is'

const primitiveTypes = [
  'string',
  'integer',
  'number',
  'boolean',
  'date',
  'object',
]

const typeFromProp = (prop: unknown) =>
  isPropertySchema(prop) ? prop.$cast : prop

const defaultFromProp = (prop?: string | PropertyShape) => {
  if (isPropertySchema(prop)) {
    if (prop.hasOwnProperty('$const')) {
      return { $transform: 'fixed', value: prop.$const }
    } else if (prop.hasOwnProperty('$default')) {
      return { $alt: 'value', value: prop.$default }
    }
  }
  return undefined
}

const hasArrayNotation = (value: string) => value.endsWith('[]')

const extractType = (type: string) =>
  hasArrayNotation(type)
    ? ([type.slice(0, type.length - 2), true] as const)
    : ([type, false] as const)

const appendBrackets = (field: string) => `${field}[]`

const transformFromType = (type: string) => {
  if (primitiveTypes.includes(type)) {
    return { $transform: type }
  } else if (type === 'float') {
    return { $transform: 'number' }
  } else if (type === 'unknown') {
    return undefined
  } else {
    return { $transform: 'reference', type }
  }
}

const mappingFromSchema = (schema: Shape, iterate = false): MapObject =>
  Object.entries(schema).reduce(
    (mapping, [field, prop]) => {
      if (isSchema(prop)) {
        return {
          ...mapping,
          [field]: [field, mappingFromSchema(prop, hasArrayNotation(field))],
        }
      }

      const type = typeFromProp(prop)
      if (typeof type !== 'string') {
        return mapping
      }

      const [realType, isArray] = extractType(type)
      const realField = isArray ? appendBrackets(field) : field

      return {
        ...mapping,
        [realField]: [
          realField,
          isArray || realType === 'unknown'
            ? undefined
            : { $transform: 'unarray' },
          defaultFromProp(prop),
          transformFromType(realType),
        ].filter(Boolean),
      }
    },
    iterate ? { $iterate: true } : {}
  )

const noSchemaOrEqualType = (data: unknown, type: string) =>
  !isTypedData(data) || data.$type === type

const includeInCasting = (type: string) =>
  type
    ? (data: unknown) =>
        !isNullOrUndefined(data) && noSchemaOrEqualType(data, type)
    : (data: unknown) => !isNullOrUndefined(data)

const cleanUpCast = (type: string, isFwd: boolean) =>
  mapAny((item: unknown) => {
    if (isDataObject(item)) {
      const { $type, isNew, isDeleted, id, ...shape } = item
      return {
        id,
        ...(isFwd && { $type: type }),
        ...shape,
        ...(isNew === true ? { isNew } : {}),
        ...(isDeleted === true ? { isDeleted } : {}),
      }
    } else {
      return item
    }
  })

export default function createCastMapping(
  schema: Shape,
  type: string
): MapDefinition {
  const filterItem = filter(includeInCasting(type))
  const cleanUpTransform = transform(
    cleanUpCast(type, true), // Forward
    cleanUpCast(type, false) // Reverse
  )

  return [
    fwd(filterItem),
    rev(cleanUpTransform),
    {
      $iterate: true,
      ...mappingFromSchema(schema),
      isNew: ['isNew', { $transform: 'boolean' }],
      isDeleted: ['isDeleted', { $transform: 'boolean' }],
    },
    fwd(cleanUpTransform),
    rev(filterItem),
  ]
}
