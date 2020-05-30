import jsonAdapter from 'integreat-adapter-json'

import json from './transformers/json'

export default {
  adapters: { json: jsonAdapter() },
  transformers: { json },
}
