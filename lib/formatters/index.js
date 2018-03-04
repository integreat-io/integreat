const gatherResources = require('../utils/gatherResources')

const formatters = [
  'not',
  'hash'
]

module.exports = gatherResources(formatters, __dirname)
