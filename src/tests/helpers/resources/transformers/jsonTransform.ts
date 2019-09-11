export default function jsonTransform() {
  return (data, { rev }: { rev: boolean }) =>
    rev ? JSON.stringify(data) : JSON.parse(data)
}
