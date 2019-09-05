export default (id, type, fields = {}, relationships = {}) =>
  ({ id, $type: type, ...fields, ...relationships })
