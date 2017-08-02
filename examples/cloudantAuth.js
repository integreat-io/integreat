module.exports = {
  id: 'cloudant',
  strategy: 'token',
  options: {
    token: process.env.GREAT_TOKEN1,
    encode: true,
    type: 'Basic'
  }
}
