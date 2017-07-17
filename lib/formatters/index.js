const gatherResources = require('../utils/gatherResources')

const formatters = [
  'date',
  'float',
  'integer',
  'not'
]

module.exports = gatherResources(formatters, __dirname)
