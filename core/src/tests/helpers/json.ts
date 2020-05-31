import httpTransporter from '../../../../transporter-http/src/transporter'
import exchangeJsonMutation from './defs/mutations/exchangeJson'
import exchangeUriMutation from './defs/mutations/exchangeUri'
import json from '../../transformers/json'

export const jsonPipelines = {
  'exchange:json': exchangeJsonMutation,
  'exchange:uri': exchangeUriMutation,
}

export const jsonServiceDef = {
  transporter: httpTransporter,
  mutation: [{ $apply: 'exchange:json' }, { $apply: 'exchange:uri' }],
}

export const jsonFunctions = { json }
