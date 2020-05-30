import { TransformFunction } from '../types'
import gatherResources from '../utils/gatherResources'

const transformers = [
  'not',
  'hash',
  'lowercase',
  'removeTypePrefixOnId',
  'trim',
  'uppercase',
]

export default gatherResources<TransformFunction>(transformers, __dirname)
