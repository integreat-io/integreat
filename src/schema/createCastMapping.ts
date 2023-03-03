import mapAny = require('map-any')
import {
  MapObject,
  MapDefinition,
  MapPipe,
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
import { ensureArrayOrUndefined } from '../utils/array.js'

const primitiveTypes = [
  'string',
  'integer',
  'number',
  'boolean',
  'date',
  'object',
]

const typeFromProp = (prop?: string | PropertyShape) =>
  isPropertySchema(prop) ? prop.$cast : prop

const defaultFromProp = (prop?: string | PropertyShape) => {
  if (isPropertySchema(prop)) {
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
  pipeline: MapPipe
) => ({
  [field]: [
    field,
    isArray ? rev(transform(ensureArrayOrUndefined)) : undefined,
    ...pipeline,
    isArray ? fwd(transform(ensureArrayOrUndefined)) : undefined,
  ].filter(Boolean),
})

const mappingFromSchema = (schema: Shape, iterate = false): MapObject =>
  Object.entries(schema).reduce(
    (mapping, [field, prop]) => {
      const [realField, isFieldArray] = removeArrayNotation(field)

      if (isSchema(prop)) {
        return {
          ...mapping,
          ...generateFieldPipeline(realField, isFieldArray, [
            mappingFromSchema(prop, hasArrayNotation(field)),
          ]),
        }
      }

      const type = typeFromProp(prop)
      if (typeof type !== 'string') {
        return mapping
      }

      const [realType, isTypeArray] = removeArrayNotation(type)
      const isArray = isTypeArray || isFieldArray

      return {
        ...mapping,
        ...generateFieldPipeline(realField, isArray, [
          ...unarray(realType, isArray),
          ...defaultFromProp(prop),
          ...transformFromType(realType),
        ]),
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
      const { $type, $ref, isNew, isDeleted, id, ...shape } = item
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
