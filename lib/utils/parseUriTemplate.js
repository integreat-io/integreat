const UriTemplate = require('urijs/src/URITemplate')

const throwIfMissingRequiredParams = (template, params) => {
  const required = template.match(/{[^}]+}/g)
  if (!required) {
    return false
  }
  for (const req of required) {
    const param = req.substr(1, req.length - 2)
    if (!/^[?&]/.test(param) && !params[param]) {
      throw new TypeError('Missing required parameter ' + param + '.')
    }
  }
}

function parseUriTemplate (template, params) {
  throwIfMissingRequiredParams(template, params)

  return UriTemplate(template).expand(params)
}

module.exports = parseUriTemplate
