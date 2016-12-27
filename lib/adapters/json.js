const request = require('request')

module.exports = {
  retrieve (endpoint) {
    return new Promise((resolve, reject) => {
      request({url: endpoint, json: true}, (error, response, body) => {
        if (error) {
          reject(error)
        } else if (response.statusCode !== 200) {
          reject(new Error(`Server returned ${response.statusCode} for ${endpoint}`))
        } else {
          resolve(body)
        }
      })
    })
  }
}
