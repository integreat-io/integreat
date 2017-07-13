const tokenAuth = require('../lib/authStrats/token')

module.exports = tokenAuth({
  token: process.env.GREAT_TOKEN1,
  encode: true,
  type: 'Basic'
})
