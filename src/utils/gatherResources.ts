export default function gatherResources(resources: string[], dir: string) {
  return (...ids: string[]) => {
    if (ids.length === 0) {
      ids = resources
    }

    // eslint-disable-next-line security/detect-non-literal-require
    const requireResource = (id: string) => require(`${dir}/${id}`).default

    return ids.reduce(
      (obj, id) =>
        resources.includes(id) ? { ...obj, [id]: requireResource(id) } : obj,
      {}
    )
  }
}
