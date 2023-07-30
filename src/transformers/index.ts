import generateUri from './generateUri.js'
import trim from './trim.js'
import type { Transformer } from 'map-transform/types.js'

const transfomers: Record<string, Transformer> = {
  generateUri,
  trim,
}

export default transfomers
