export default () =>
  function json(data: unknown, { rev }: { rev: boolean }) {
    if (rev) {
      // To service
      return JSON.stringify(data)
    } else if (typeof data === 'string') {
      // From service
      try {
        return JSON.parse(data)
      } catch {}
    }
    return data
  }
