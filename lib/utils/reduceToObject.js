function reduceToObject (key) {
  return (obj, item) => (item[key]) ? Object.assign(obj, {[item[key]]: item}) : obj
}

module.exports = reduceToObject
