import { Transformer } from 'map-transform'
import form from './form.js'
import json from './json.js'
import not from './not.js'
import trim from './trim.js'

const transfomers: Record<string, Transformer> = {
  form,
  json,
  not,
  trim,
}

export default transfomers
