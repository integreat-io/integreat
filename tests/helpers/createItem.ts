export default (id, type, fields = {}, relationships = {}) =>
  ({ id, $schema: type, ...fields, ...relationships })
