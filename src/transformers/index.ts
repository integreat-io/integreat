import type { Transformer } from 'map-transform/types.js'
import transformers from 'integreat-transformers'
import form from './form.js'
import json from './json.js'
import trim from './trim.js'

const transfomers: Record<string, Transformer> = {
  form,
  json,
  template: transformers.template, // TODO: Remove this when we've found a better way to handle uri params
  trim,
}

export default transfomers
