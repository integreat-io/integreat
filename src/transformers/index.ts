import type { Transformer } from 'map-transform/types.js'
import form from './form.js'
import generateUri from './generateUri.js'
import json from './json.js'
import trim from './trim.js'

const transfomers: Record<string, Transformer> = {
  form,
  generateUri,
  json,
  trim,
}

export default transfomers
