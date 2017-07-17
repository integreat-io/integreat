const gatherResources = require('../utils/gatherResources')

const queues = [
  'date',
  'float',
  'integer',
  'not'
]

module.exports = gatherResources(queues, __dirname)
