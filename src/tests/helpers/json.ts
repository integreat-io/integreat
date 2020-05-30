import exchangeJsonMapping from './defs/mappings/exchangeJson'
import jsonAdapter from 'integreat-adapter-json'
import jsonTransformer from './resources/transformers/json'

export const jsonPipelines = { 'exchange:json': exchangeJsonMapping.mapping }

export const jsonServiceDef = {
  adapter: jsonAdapter(),
  mutation: [{ $apply: 'exchange:json' }],
}

export const jsonFunctions = {
  json: jsonTransformer,
}
