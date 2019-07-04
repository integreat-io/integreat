import gatherResources from '../utils/gatherResources'

const transformers = [
  'not',
  'hash',
  'lowercase',
  'removeTypePrefixOnId',
  'trim',
  'uppercase'
]

export default gatherResources(transformers, __dirname)
