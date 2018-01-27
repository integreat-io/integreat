module.exports = (item, field) =>
  item[field] || item.attributes[field] ||
  (item.relationships[field] && ((Array.isArray(item.relationships[field]))
    ? item.relationships[field].map((rel) => rel.id)
    : item.relationships[field].id)
  )
