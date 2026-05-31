export default function ArrivalPage({ ctx }) {
  const {
    arrivalAnalysis,
    arrivalErrorFieldFilters,
    matchesArrivalErrorSelection,
    arrivalErrorPage,
    ARRIVAL_ERROR_PAGE_SIZE,
    setArrivalMainTab,
    arrivalMainTab,
    toggleArrivalErrorField,
    setArrivalErrorPage,
    formatNumber,
    formatMoney,
    formatPartCode,
    loadArrivalAnalysis,
    arrivalLoading,
    exportArrivalErrors,
    exportArrivalSummary,
    openArrivalFileDetail,
    exportArrivalAdvByFile,
    exportArrivalCustomer,
    renderPagination,
  } = ctx

  const summary = arrivalAnalysis?.summary || {}
  const arrivalYears = summary.arrivalYears || {}
  const arrival2025 = arrivalYears['2025'] || { files: 0, rows: 0 }
  const arrival2026 = arrivalYears['2026'] || { files: 0, rows: 0 }
  const errorFieldStats = arrivalAnalysis?.errorFieldStats || []
  const fileStats = arrivalAnalysis?.fileStats || []
  const customerStats = arrivalAnalysis?.customerStats || []
  const checks = arrivalAnalysis?.checks || []

  const displayChecks = checks.filter((item) => {
    if (item.checkResult !== '有错误') return false
    return matchesArrivalErrorSelection(item, arrivalErrorFieldFilters)
  })

  const pagedDisplayChecks = displayChecks.slice(
    (arrivalErrorPage - 1) * ARRIVAL_ERROR_PAGE_SIZE,
    arrivalErrorPage * ARRIVAL_ERROR_PAGE_SIZE,
  )

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">到货信息统计</h2>
            <p className="text-sm text-slate-500">已将全部到货明细（同格式）统一入库，并按 adv_gen.ipynb 规则核对。</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => loadArrivalAnalysis()}
              disabled={arrivalLoading}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {arrivalLoading ? '检查中...' : '重新核对'}
            </button>
            <button
              onClick={exportArrivalErrors}
              disabled={arrivalLoading || !(summary.errorRows > 0)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              导出错误
            </button>
            <button
              onClick={exportArrivalSummary}
              disabled={arrivalLoading || (!fileStats.length && !customerStats.length)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              导出汇总
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><div className="text-sm text-slate-500">到货文件数</div><div className="mt-1 text-xl font-semibold">{formatNumber(summary.totalFiles)}</div></div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><div className="text-sm text-slate-500">2025到货文件数</div><div className="mt-1 text-xl font-semibold">{formatNumber(arrival2025.files)}</div></div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><div className="text-sm text-slate-500">2026到货文件数</div><div className="mt-1 text-xl font-semibold">{formatNumber(arrival2026.files)}</div></div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><div className="text-sm text-slate-500">总到货行数</div><div className="mt-1 text-xl font-semibold">{formatNumber(summary.totalRows)}</div></div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><div className="text-sm text-slate-500">有效检查行数</div><div className="mt-1 text-xl font-semibold">{formatNumber(summary.checkedRows)}</div></div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><div className="text-sm text-slate-500">正确行数</div><div className="mt-1 text-xl font-semibold text-emerald-700">{formatNumber(summary.correctRows)}</div></div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><div className="text-sm text-slate-500">错误行数</div><div className="mt-1 text-xl font-semibold text-rose-700">{formatNumber(summary.errorRows)}（{summary.errorRate ?? 0}%）</div></div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex gap-2">
          <button onClick={() => setArrivalMainTab('detail')} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${arrivalMainTab === 'detail' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>详情</button>
          <button onClick={() => setArrivalMainTab('summary')} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${arrivalMainTab === 'summary' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>按文件汇总</button>
          <button onClick={() => setArrivalMainTab('customerSummary')} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${arrivalMainTab === 'customerSummary' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>按客户汇总</button>
        </div>
      </div>

      {!!arrivalAnalysis?.message && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{arrivalAnalysis.message}</div>
      )}

      {arrivalMainTab === 'detail' ? (
        <>
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-200 px-5 py-4"><h3 className="text-base font-semibold">错误字段统计</h3></div>
            <div className="overflow-x-auto px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {errorFieldStats.map((item) => (
                  <button
                    key={item.field}
                    onClick={() => toggleArrivalErrorField(item.field)}
                    className={`rounded-full px-3 py-1 text-sm transition ${arrivalErrorFieldFilters.includes(item.field) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {item.field}：{formatNumber(item.count)}
                  </button>
                ))}
                {!errorFieldStats.length && <span className="text-sm text-slate-500">暂无错误字段统计。</span>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h3 className="text-base font-semibold">错误明细（最多显示5000条）</h3>
                <div className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white">有问题（{formatNumber(displayChecks.length)}）</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3">行号</th><th className="px-4 py-3">到货时间</th><th className="px-4 py-3">来源文件</th><th className="px-4 py-3">合同号</th><th className="px-4 py-3">客户</th><th className="px-4 py-3">零件号</th><th className="px-4 py-3">序号</th><th className="px-4 py-3">零件名</th><th className="px-4 py-3">个数</th><th className="px-4 py-3">单价</th><th className="px-4 py-3">总价</th><th className="px-4 py-3">检查结果</th><th className="px-4 py-3">错误字段</th><th className="px-4 py-3">历史匹配情况</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {pagedDisplayChecks.map((item, index) => (
                    <tr key={`${item.rowIndex}-${index}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{formatNumber(item.rowIndex)}</td>
                      <td className="px-4 py-3">{item.arrivalDate || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{item.sourceFile || '-'}</td>
                      <td className="px-4 py-3">{item.contractNo || '-'}</td>
                      <td className="px-4 py-3">{item.customerCode || '-'}</td>
                      <td className="px-4 py-3">{formatPartCode(item.partNo)}</td>
                      <td className="px-4 py-3">{formatNumber(item.sequence)}</td>
                      <td className="px-4 py-3">{item.partName || '-'}</td>
                      <td className="px-4 py-3">{formatNumber(item.quantity)}</td>
                      <td className="px-4 py-3">{formatMoney(item.unitPrice)}</td>
                      <td className="px-4 py-3">{formatMoney(item.totalPrice)}</td>
                      <td className={`px-4 py-3 font-medium ${item.checkResult === '有错误' ? 'text-rose-700' : 'text-emerald-700'}`}>{item.checkResult || '-'}</td>
                      <td className="px-4 py-3 text-rose-700">{item.errorFields || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{item.checkResult === '有错误' ? (item.actualMatch || '-') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!displayChecks.length && <div className="px-5 py-8 text-sm text-slate-500">当前筛选下没有记录。</div>}
            </div>
            {!!displayChecks.length && renderPagination({ total: displayChecks.length, page: arrivalErrorPage, pageSize: ARRIVAL_ERROR_PAGE_SIZE }, setArrivalErrorPage)}
          </div>
        </>
      ) : arrivalMainTab === 'summary' ? (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-5 py-4"><h3 className="text-base font-semibold">按到货文件汇总统计</h3></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr><th className="px-4 py-3">来源文件</th><th className="px-4 py-3">到货日期</th><th className="px-4 py-3">到货客户数</th><th className="px-4 py-3">到货合同数</th><th className="px-4 py-3">到货行数</th><th className="px-4 py-3">有效检查行数</th><th className="px-4 py-3">错误行数</th><th className="px-4 py-3">到货总个数</th><th className="px-4 py-3">到货总金额</th><th className="px-4 py-3">操作</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {fileStats.map((item, index) => (
                  <tr key={`${item.sourceFile || 'unknown'}-${index}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{item.sourceFile || '-'}</td>
                    <td className="px-4 py-3">{item.arrivalDateRange || '-'}</td>
                    <td className="px-4 py-3">{formatNumber(item.customerCount)}</td>
                    <td className="px-4 py-3">{formatNumber(item.contractCount)}</td>
                    <td className="px-4 py-3">{formatNumber(item.totalRows)}</td>
                    <td className="px-4 py-3">{formatNumber(item.checkedRows)}</td>
                    <td className="px-4 py-3 text-rose-700">{formatNumber(item.errorRows)}</td>
                    <td className="px-4 py-3">{formatNumber(item.totalQuantity)}</td>
                    <td className="px-4 py-3">{formatMoney(item.totalAmount)}</td>
                    <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => openArrivalFileDetail(item.sourceFile)} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100">详情</button><button onClick={() => exportArrivalAdvByFile(item.sourceFile)} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100">导出ADV</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!fileStats.length && <div className="px-5 py-8 text-sm text-slate-500">暂无到货文件汇总数据。</div>}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-5 py-4"><h3 className="text-base font-semibold">按客户汇总统计</h3></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr><th className="px-4 py-3">客户编号</th><th className="px-4 py-3">到货文件数</th><th className="px-4 py-3">到货日期</th><th className="px-4 py-3">到货合同数</th><th className="px-4 py-3">到货涵盖合同</th><th className="px-4 py-3">到货行数</th><th className="px-4 py-3">到货总个数</th><th className="px-4 py-3">到货总金额</th><th className="px-4 py-3">操作</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {customerStats.map((item, index) => (
                  <tr key={`${item.customerCode || 'unknown'}-${index}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{item.customerCode || '-'}</td>
                    <td className="px-4 py-3">{formatNumber(item.arrivalFileCount)}</td>
                    <td className="px-4 py-3 text-slate-500">{item.arrivalDates?.join('、') || '-'}</td>
                    <td className="px-4 py-3">{formatNumber(item.contractCount)}</td>
                    <td className="px-4 py-3 text-slate-500">{item.contracts?.join('、') || '-'}</td>
                    <td className="px-4 py-3">{formatNumber(item.totalRows)}</td>
                    <td className="px-4 py-3">{formatNumber(item.totalQuantity)}</td>
                    <td className="px-4 py-3">{formatMoney(item.totalAmount)}</td>
                    <td className="px-4 py-3"><button onClick={() => exportArrivalCustomer(item.customerCode)} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100">导出Excel</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!customerStats.length && <div className="px-5 py-8 text-sm text-slate-500">暂无客户汇总数据。</div>}
          </div>
        </div>
      )}
    </div>
  )
}
