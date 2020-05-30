import exchangeJsonMutation from './defs/mutations/exchangeJson'
import jsonAdapter from 'integreat-adapter-json'
import jsonTransformer from './resources/transformers/json'

export const jsonPipelines = { 'exchange:json': exchangeJsonMutation }

export const jsonServiceDef = {
  adapter: jsonAdapter(),
  mutation: [{ $apply: 'exchange:json' }],
}

export const jsonFunctions = {
  json: jsonTransformer,
}
