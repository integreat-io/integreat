const gatherResources = require('../utils/gatherResources')

const workers = [
  'sync',
  'deleteExpired'
]

module.exports = gatherResources(workers, __dirname)
