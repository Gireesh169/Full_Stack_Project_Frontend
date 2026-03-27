const Loader = ({ label = 'Loading...' }) => {
  return (
    <div className="flex min-h-[180px] items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-sm">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  )
}

export default Loader
