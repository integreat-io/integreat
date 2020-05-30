export default (id: string, type: string, shape = {}, relationships = {}) => ({
  id,
  $type: type,
  ...shape,
  ...relationships,
})
