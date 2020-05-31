import httpTransporter from '../../../../transporter-http/src/transporter'
import exchangeJsonMutation from './defs/mutations/exchangeJson'
import jsonTransformer from './resources/transformers/json'

export const jsonPipelines = { 'exchange:json': exchangeJsonMutation }

export const jsonServiceDef = {
  transporter: httpTransporter,
  mutation: [{ $apply: 'exchange:json' }],
}

export const jsonFunctions = {
  json: jsonTransformer,
}
