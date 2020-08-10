import httpTransporter from 'integreat-transporter-http'

import json from '../../../transformers/json'

export default {
  transporters: { http: httpTransporter },
  transformers: { json },
}
