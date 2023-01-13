import { CustomFunction } from 'map-transform'
import boolean from './boolean.js'
import date from './date.js'
import integer from './integer.js'
import number from './number.js'
import object from './object.js'
import reference from './reference.js'
import string from './string.js'
import unarray from './unarray.js'

const transformers: Record<string, CustomFunction> = {
  boolean,
  date,
  integer,
  number,
  object,
  reference,
  string,
  unarray,
}

export default transformers
