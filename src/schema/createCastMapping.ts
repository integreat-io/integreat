import { MapObject } from 'map-transform'
import { Schema, PropertySchema } from '../types'
import { isSchema, isPropertySchema } from '../utils/is'

const primitiveTypes = ['string', 'integer', 'number', 'boolean', 'date']

const typeFromProp = (prop: unknown) =>
  isPropertySchema(prop) ? prop.$cast : prop

const defaultFromProp = (prop?: string | PropertySchema) => {
  if (isPropertySchema(prop)) {
    if (prop.hasOwnProperty('$const')) {
      return { $transform: 'fixed', value: prop.$const }
    } else if (prop.hasOwnProperty('$default')) {
      return { $alt: 'value', value: prop.$default }
    }
  }
  return undefined
}

const extractType = (type: string) =>
  type.endsWith('[]')
    ? ([type.substr(0, type.length - 2), true] as const)
    : ([type, false] as const)

const appendBrackets = (field: string) => `${field}[]`

const transformFromType = (type: string) => {
  if (primitiveTypes.includes(type)) {
    return { $transform: type }
  } else if (type === 'float') {
    return { $transform: 'number' }
  } else {
    return { $transform: 'reference', type }
  }
}

const mappingFromSchema = (schema: Schema): MapObject =>
  Object.entries(schema).reduce((mapping, [field, prop]) => {
    if (isSchema(prop)) {
      return { ...mapping, [field]: [field, mappingFromSchema(prop)] }
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
        defaultFromProp(prop),
        transformFromType(realType)
      ].filter(Boolean)
    }
  }, {})

export default function createCastMapping(schema: Schema, type: string) {
  return [
    { $filter: 'equalOrNoSchema', type },
    {
      $iterate: true,
      $schema: ['$schema', { $transform: 'fixed', value: type }],
      ...mappingFromSchema(schema)
    }
  ]
}
