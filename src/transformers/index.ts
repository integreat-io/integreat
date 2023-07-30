import trim from './trim.js'
import type { Transformer } from 'map-transform/types.js'

const transfomers: Record<string, Transformer> = {
  trim,
}

export default transfomers
