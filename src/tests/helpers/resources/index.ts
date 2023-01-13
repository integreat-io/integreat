import httpTransporter from 'integreat-transporter-http'
import formatDate from '../../../transformers/formatDate.js'
import json from '../../../transformers/json.js'
import { Resources } from '../../../create.js'

const resources: Resources = {
  transporters: { http: httpTransporter },
  transformers: { formatDate, json },
}

export default resources
