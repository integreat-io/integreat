import httpTransporter from 'integreat-transporter-http'
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
