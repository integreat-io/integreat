const TokenAuth = require('../lib/authStrats/token')

module.exports = new TokenAuth({
  token: process.env.GREAT_TOKEN1,
  encode: true,
  type: 'Basic'
})
