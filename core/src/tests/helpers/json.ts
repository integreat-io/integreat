import httpTransporter from '../../../../transporter-http/src/transporter'
import mutations from '../../mutations'
import json from '../../transformers/json'

export const jsonPipelines = {
  ...mutations,
}

export const jsonServiceDef = {
  transporter: httpTransporter,
  mutation: [{ $apply: 'exchange:json' }, { $apply: 'exchange:uri' }],
}

export const jsonFunctions = { json }
