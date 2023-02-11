import httpTransporter from 'integreat-transporter-http'
import { Transformer } from 'map-transform'
import { ServiceDef } from '../../service/types.js'
import mutations from '../../mutations/index.js'
import json from '../../transformers/json.js'

export const jsonPipelines = {
  ...mutations,
}

export const jsonServiceDef: Partial<ServiceDef> = {
  transporter: httpTransporter,
  mutation: [{ $apply: 'exchange:json' }, { $apply: 'exchange:uri' }],
}

export const jsonFunctions: Record<string, Transformer> = { json }
