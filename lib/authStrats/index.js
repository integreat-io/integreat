const gatherResources = require('../utils/gatherResources')

const authStrats = [
  'options',
  'token'
]

module.exports = gatherResources(authStrats, __dirname)
