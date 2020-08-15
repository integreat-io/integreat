/* eslint-disable @typescript-eslint/no-var-requires */
export default function gatherResources<T = unknown>(
  resources: string[],
  dir: string
) {
  return (...ids: string[]): Record<string, T> => {
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
