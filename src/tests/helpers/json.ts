import httpTransporter from 'integreat-transporter-http'
import { CustomFunction } from 'map-transform'
import mutations from '../../mutations/index.js'
import json from '../../transformers/json.js'

export const jsonPipelines = {
  ...mutations,
}

export const jsonServiceDef = {
  transporter: httpTransporter.default,
  mutation: [{ $apply: 'exchange:json' }, { $apply: 'exchange:uri' }],
}

export const jsonFunctions: Record<string, CustomFunction> = { json }
