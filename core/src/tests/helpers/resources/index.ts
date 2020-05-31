import httpTransporter from '../../../../../transporter-http/src/transporter'

import json from '../../../transformers/json'

export default {
  transporters: { http: httpTransporter },
  transformers: { json },
}
