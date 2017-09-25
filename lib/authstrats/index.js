const gatherResources = require('../utils/gatherResources')

const auth = [
  'options',
  'token',
  'oauth2'
]

module.exports = gatherResources(auth, __dirname)
