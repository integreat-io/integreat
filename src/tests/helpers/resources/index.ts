import httpTransporter from 'integreat-transporter-http'

import formatDate from '../../../transformers/formatDate'
import json from '../../../transformers/json'

export default {
  transporters: { http: httpTransporter },
  transformers: { formatDate, json },
}
