const gatherResources = require('../utils/gatherResources')

const transformers = [
  'not',
  'hash'
]

module.exports = gatherResources(transformers, __dirname)
