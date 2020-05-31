import httpTransporter from '../../../../transporter-http/src/transporter'
import exchangeJsonMutation from './defs/mutations/exchangeJson'
import json from '../../transformers/json'

export const jsonPipelines = { 'exchange:json': exchangeJsonMutation }

export const jsonServiceDef = {
  transporter: httpTransporter,
  mutation: [{ $apply: 'exchange:json' }],
}

export const jsonFunctions = { json }
