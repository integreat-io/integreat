import httpTransporter from 'integreat-transporter-http'
import jsonAdapter from 'integreat-adapter-json'
import uriAdapter from '../../adapters/uri.js'
import type { ServiceDef } from '../../service/types.js'

const jsonServiceDef: Partial<ServiceDef> = {
  transporter: httpTransporter,
  adapters: [jsonAdapter, uriAdapter],
}

export default jsonServiceDef
