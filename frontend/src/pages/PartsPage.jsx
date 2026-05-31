export default function PartsPage({ ctx }) {
  const {
    partSearch,
    setPartSearch,
    setPartPage,
    partsLoading,
    parts,
    partMeta,
    formatNumber,
    formatMoney,
    formatPartCode,
    openPartAnalysis,
    renderPagination,
  } = ctx

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">零件信息</h2>
            <p className="text-sm text-slate-500">按零件查看历史总个数、累计金额和销售价格区间。</p>
          </div>
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            placeholder="搜索零件号 / 互换零件号 / 零件名"
            value={partSearch}
            onChange={(e) => {
              setPartSearch(e.target.value)
              setPartPage(1)
            }}
          />
        </div>
      </div>

      {partsLoading ? (
        <div className="px-5 py-10 text-sm text-slate-500">正在加载零件数据...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">序号</th>
                <th className="px-4 py-3">零件号</th>
                <th className="px-4 py-3">互换零件号</th>
                <th className="px-4 py-3">零件名</th>
                <th className="px-4 py-3">历史总个数</th>
                <th className="px-4 py-3">累计金额</th>
                <th className="px-4 py-3">最低销售价</th>
                <th className="px-4 py-3">最高销售价</th>
                <th className="px-4 py-3">详情分析</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {parts.map((item, index) => (
                <tr key={`${item.partNo || 'na'}-${item.interchangePartNo || 'na'}-${index}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{(partMeta.page - 1) * partMeta.pageSize + index + 1}</td>
                  <td className="px-4 py-3 font-medium">{formatPartCode(item.partNo)}</td>
                  <td className="px-4 py-3">{formatPartCode(item.interchangePartNo)}</td>
                  <td className="px-4 py-3">{item.partName || '-'}</td>
                  <td className="px-4 py-3">{formatNumber(item.totalQuantity)}</td>
                  <td className="px-4 py-3">{formatMoney(item.totalAmount)}</td>
                  <td className="px-4 py-3">{formatMoney(item.minUnitPrice)}</td>
                  <td className="px-4 py-3">{formatMoney(item.maxUnitPrice)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openPartAnalysis(item)}
                      className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                      详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!parts.length && <div className="px-5 py-8 text-sm text-slate-500">没有匹配到零件数据。</div>}
        </div>
      )}
      {renderPagination(partMeta, setPartPage)}
    </div>
  )
}
