export default function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="space-y-6">
      <div className="space-y-3">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-11 w-80 max-w-full" />
        <div className="skeleton h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-40 !rounded-3xl" />)}
      </div>
      <div className="skeleton h-72 !rounded-3xl" />
    </div>
  )
}
