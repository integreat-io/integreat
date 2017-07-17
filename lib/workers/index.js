const gatherResources = require('../utils/gatherResources')

const workers = [
  'sync'
]

module.exports = gatherResources(workers, __dirname)
