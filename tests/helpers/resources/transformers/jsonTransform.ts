const jsonTransform = (obj) => JSON.parse(obj)
jsonTransform.rev = (str) => JSON.stringify(str)

export default jsonTransform
