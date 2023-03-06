import httpTransporter from 'integreat-transporter-http'
import type { Transformer } from 'map-transform/types.js'
import type { ServiceDef } from '../../service/types.js'
import mutations from '../../mutations/index.js'
import transformers from '../../transformers/index.js' // TODO: We're including too many here. Fix when we don't need to include the template transformer anymore

export const jsonPipelines = {
  ...mutations,
}

export const jsonServiceDef: Partial<ServiceDef> = {
  transporter: httpTransporter,
  mutation: [{ $apply: 'exchange:json' }, { $apply: 'exchange:uri' }],
}

export const jsonFunctions: Record<string, Transformer> = transformers
