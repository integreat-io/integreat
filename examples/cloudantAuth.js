const tokenAuth = require('../lib/auth/token')

module.exports = tokenAuth({
  token: process.env.GREAT_TOKEN1,
  encode: true,
  type: 'Basic'
})
