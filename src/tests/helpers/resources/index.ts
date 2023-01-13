import httpTransporter from 'integreat-transporter-http'
import formatDate from '../../../transformers/formatDate.js'
import json from '../../../transformers/json.js'

export default {
  transporters: { http: httpTransporter.default },
  transformers: { formatDate, json },
}
