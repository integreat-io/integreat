import httpTransporter from 'integreat-transporter-http'
import transformers from '../../../transformers/index.js'
import { Resources } from '../../../create.js'

const isoDate = () => (date: unknown) =>
  date instanceof Date ? date.toISOString() : undefined

const resources: Resources = {
  transporters: { http: httpTransporter },
  transformers: { ...transformers, isoDate },
}

export default resources
