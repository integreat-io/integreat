export default (id, type, shape = {}, relationships = {}) => ({
  id,
  $type: type,
  ...shape,
  ...relationships
})
