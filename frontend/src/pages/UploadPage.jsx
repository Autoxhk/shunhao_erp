export default function UploadPage({ ctx }) {
  const {
    apiFetch,
    uploadOrderFile,
    setUploadOrderFile,
    uploadOrderLoading,
    setUploadOrderLoading,
    uploadOrderStatus,
    setUploadOrderStatus,
    uploadArrivalFiles,
    setUploadArrivalFiles,
    uploadArrivalLoading,
    setUploadArrivalLoading,
    uploadArrivalStatus,
    setUploadArrivalStatus,
    loadDashboard,
    loadContracts,
    loadCustomers,
    loadParts,
    loadArrivalAnalysis,
  } = ctx

  async function downloadUploadTemplate(url, filename) {
    try {
      const response = await apiFetch(url)
      if (!response.ok) {
        const json = await response.json().catch(() => ({}))
        throw new Error(json.message || '下载模板失败')
      }
      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      alert(error.message)
    }
  }

  async function handleUploadOrders() {
    if (!uploadOrderFile) return
    setUploadOrderLoading(true)
    setUploadOrderStatus(null)
    try {
      const form = new FormData()
      form.append('file', uploadOrderFile)
      const res = await apiFetch('/api/upload-orders', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || '上传失败')
      setUploadOrderStatus({ ok: true, message: `导入成功：${json.imported} 条记录`, detail: json })
      setUploadOrderFile(null)
      await Promise.all([loadDashboard(), loadContracts(), loadCustomers(), loadParts()])
    } catch (err) {
      setUploadOrderStatus({ ok: false, message: err.message })
    } finally {
      setUploadOrderLoading(false)
    }
  }

  async function handleUploadArrivals() {
    if (!uploadArrivalFiles.length) return
    setUploadArrivalLoading(true)
    setUploadArrivalStatus(null)
    try {
      const form = new FormData()
      uploadArrivalFiles.forEach((f) => form.append('files', f))
      const res = await apiFetch('/api/upload-arrivals', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || '上传失败')
      const savedCount = (json.savedFiles || []).length
      const skippedCount = (json.skippedFiles || []).length
      setUploadArrivalStatus({ ok: true, message: `导入 ${json.imported} 条记录，新增 ${savedCount} 个文件，跳过 ${skippedCount} 个重复文件`, detail: json })
      setUploadArrivalFiles([])
      await loadArrivalAnalysis()
    } catch (err) {
      setUploadArrivalStatus({ ok: false, message: err.message })
    } finally {
      setUploadArrivalLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-800">上传合同表</h3>
          <button
            onClick={() => downloadUploadTemplate('/api/upload-orders-template', '合同上传模板.xlsx')}
            className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            下载模板
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">上传后将替换现有合同数据并重新导入数据库，格式须与 isuzu_data.xlsx 一致</p>
        <p className="text-xs text-amber-700 mb-4 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
          第一行表头必须严格为：序号、零件号、互换零件号、零件名、中文零件名、单价、个数、总价、合同号。
        </p>
        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files[0]
            if (f && f.name.endsWith('.xlsx')) setUploadOrderFile(f)
          }}
          onClick={() => document.getElementById('order-file-input').click()}
        >
          <svg className="mb-3 h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {uploadOrderFile ? (
            <p className="text-sm font-medium text-indigo-700">{uploadOrderFile.name}</p>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-600">点击或拖拽上传合同表</p>
              <p className="text-xs text-slate-400 mt-1">仅支持 .xlsx 文件</p>
            </>
          )}
          <input id="order-file-input" type="file" accept=".xlsx" className="hidden" onChange={(e) => {
            const f = e.target.files[0]
            if (f) setUploadOrderFile(f)
            e.target.value = ''
          }} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleUploadOrders}
            disabled={!uploadOrderFile || uploadOrderLoading}
            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploadOrderLoading ? '导入中...' : '确认上传'}
          </button>
          {uploadOrderFile && (
            <button onClick={() => { setUploadOrderFile(null); setUploadOrderStatus(null) }} className="text-sm text-slate-500 hover:text-slate-700">
              取消
            </button>
          )}
        </div>
        {uploadOrderStatus && (
          <div className={`mt-3 rounded-lg px-4 py-3 text-sm ${uploadOrderStatus.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {uploadOrderStatus.message}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-800">上传到货表</h3>
          <button
            onClick={() => downloadUploadTemplate('/api/upload-arrivals-template', '到货上传模板.xlsx')}
            className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            下载模板
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">可一次选择多个文件，已存在的文件名会自动跳过，格式须与「Isuzu-XXXXXX- 国内-到货明细.xlsx」一致</p>
        <p className="text-xs text-amber-700 mb-4 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
          第一行表头建议为：合同号、序号、零件号、互换零件号、零件名、个数、单价、总价。
        </p>
        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 hover:border-emerald-400 hover:bg-emerald-50 transition-colors cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const newFiles = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith('.xlsx'))
            setUploadArrivalFiles((prev) => {
              const existing = new Set(prev.map((f) => f.name))
              return [...prev, ...newFiles.filter((f) => !existing.has(f.name))]
            })
          }}
          onClick={() => document.getElementById('arrival-file-input').click()}
        >
          <svg className="mb-3 h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {uploadArrivalFiles.length > 0 ? (
            <p className="text-sm font-medium text-emerald-700">已选择 {uploadArrivalFiles.length} 个文件</p>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-600">点击或拖拽上传到货表（支持多选）</p>
              <p className="text-xs text-slate-400 mt-1">仅支持 .xlsx 文件</p>
            </>
          )}
          <input id="arrival-file-input" type="file" accept=".xlsx" multiple className="hidden" onChange={(e) => {
            const newFiles = Array.from(e.target.files).filter((f) => f.name.endsWith('.xlsx'))
            setUploadArrivalFiles((prev) => {
              const existing = new Set(prev.map((f) => f.name))
              return [...prev, ...newFiles.filter((f) => !existing.has(f.name))]
            })
            e.target.value = ''
          }} />
        </div>

        {uploadArrivalFiles.length > 0 && (
          <ul className="mt-3 space-y-1 max-h-40 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            {uploadArrivalFiles.map((f) => (
              <li key={f.name} className="flex items-center justify-between text-xs text-slate-600">
                <span className="truncate">{f.name}</span>
                <button onClick={() => setUploadArrivalFiles((prev) => prev.filter((x) => x.name !== f.name))} className="ml-2 shrink-0 text-slate-400 hover:text-red-500">x</button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleUploadArrivals}
            disabled={!uploadArrivalFiles.length || uploadArrivalLoading}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploadArrivalLoading ? '导入中...' : '确认上传'}
          </button>
          {uploadArrivalFiles.length > 0 && (
            <button onClick={() => { setUploadArrivalFiles([]); setUploadArrivalStatus(null) }} className="text-sm text-slate-500 hover:text-slate-700">
              清空列表
            </button>
          )}
        </div>
        {uploadArrivalStatus && (
          <div className={`mt-3 rounded-lg px-4 py-3 text-sm ${uploadArrivalStatus.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {uploadArrivalStatus.message}
            {uploadArrivalStatus.ok && uploadArrivalStatus.detail?.savedFiles?.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs opacity-80">
                {uploadArrivalStatus.detail.savedFiles.map((name) => (
                  <li key={name}>+ {name}</li>
                ))}
              </ul>
            )}
            {uploadArrivalStatus.ok && uploadArrivalStatus.detail?.skippedFiles?.length > 0 && (
              <p className="mt-1 text-xs opacity-70">跳过重复：{uploadArrivalStatus.detail.skippedFiles.join('、')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
