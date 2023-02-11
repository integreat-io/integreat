import httpTransporter from 'integreat-transporter-http'
import json from '../../../transformers/json.js'
import { Resources } from '../../../create.js'

const isoDate = () => (date: unknown) =>
  date instanceof Date ? date.toISOString() : undefined

const resources: Resources = {
  transporters: { http: httpTransporter },
  transformers: { isoDate, json },
}

export default resources
