import mapAny = require('map-any')
import {
  MapObject,
  MapDefinition,
  transform,
  fwd,
  rev,
  filter,
  ifelse,
  apply,
  iterate,
} from 'map-transform'
import { Shape, PropertyShape } from './types.js'
import {
  isObject,
  isSchema,
  isPropertySchema,
  isDataObject,
  isNullOrUndefined,
} from '../utils/is.js'

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
      return { $alt: [{ $value: prop.$default }] }
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
    return { $transform: type }
  } else if (type === 'float') {
    return { $transform: 'number' }
  } else if (type === 'unknown') {
    return undefined
  } else {
    return iterate(
      ifelse(
        isRef(type),
        { $transform: 'reference', type },
        apply(`cast_${type}`)
      )
    )
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

const includeInCasting = (type: string) =>
  type
    ? (data: unknown) => !isNullOrUndefined(data)
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
  const fieldsMapping = mappingFromSchema(schema, true) // true to get $iterate

  return [
    fwd(filterItem),
    rev(transform(cleanUpCast(type, false))),
    {
      ...fieldsMapping,
      isNew: ['isNew', { $transform: 'boolean' }],
      isDeleted: ['isDeleted', { $transform: 'boolean' }],
    },
    fwd(transform(cleanUpCast(type, true))),
    rev(filterItem),
  ]
}
