import { useState } from 'react'

export default function ContractsPage({ ctx }) {
  const {
    contractYearFilter,
    setContractYearFilter,
    setContractPage,
    contractArrivalStatusFilters,
    setContractArrivalStatusFilters,
    contractArrivalStatusCounts,
    availableContractYears,
    contractSearch,
    setContractSearch,
    contractsLoading,
    contracts,
    contractMeta,
    formatOrderDate,
    formatNumber,
    formatMoney,
    openContractDetail,
    setSelectedArrivalHistory,
    renderPagination,
  } = ctx

  const [showStatusFilterPanel, setShowStatusFilterPanel] = useState(false)
  const arrivalStatusOptions = ['到货', '部分到货', '未到货', '异常']

  function toggleArrivalStatus(status) {
    const selected = contractArrivalStatusFilters || []
    if (selected.includes(status) && selected.length === 1) return
    const next = selected.includes(status)
      ? selected.filter((item) => item !== status)
      : [...selected, status]
    setContractArrivalStatusFilters(next)
    setContractPage(1)
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <h2 className="text-lg font-semibold">合同信息</h2>
            <p className="text-sm text-slate-500">按合同查看零件总个数、到货情况和合同总金额，并可按年份筛选。</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                value={contractYearFilter}
                onChange={(e) => {
                  setContractYearFilter(e.target.value)
                  setContractPage(1)
                }}
              >
                <option value="">全部年份</option>
                {availableContractYears.map((year) => (
                  <option key={year} value={year}>{year}年</option>
                ))}
              </select>
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                placeholder="搜索合同号 / 客户"
                value={contractSearch}
                onChange={(e) => {
                  setContractSearch(e.target.value)
                  setContractPage(1)
                }}
              />
            </div>
            <button
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setShowStatusFilterPanel((prev) => !prev)}
            >
              到货状态筛选
            </button>
          </div>

          {showStatusFilterPanel && (
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              {arrivalStatusOptions.map((status) => {
                const checked = (contractArrivalStatusFilters || []).includes(status)
                const count = contractArrivalStatusCounts?.[status] || 0
                return (
                  <button
                    key={status}
                    onClick={() => toggleArrivalStatus(status)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      checked
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {status} ({formatNumber(count)})
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {contractsLoading ? (
        <div className="px-5 py-10 text-sm text-slate-500">正在加载合同数据...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">序号</th>
                <th className="px-4 py-3">合同号</th>
                <th className="px-4 py-3">下单年份</th>
                <th className="px-4 py-3">下单日期</th>
                <th className="px-4 py-3">客户</th>
                <th className="px-4 py-3">零件总个数</th>
                <th className="px-4 py-3">合同总额</th>
                <th className="px-4 py-3">到货状态</th>
                <th className="px-4 py-3">到货总个数</th>
                <th className="px-4 py-3">到货总金额</th>
                <th className="px-4 py-3">未到货总金额</th>
                <th className="px-4 py-3">详情</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {contracts.map((item, index) => {
                const getStatusColor = (status) => {
                  if (Number(item.arrivalRatio || 0) > 100) return 'bg-rose-50 text-rose-700 border border-rose-200'
                  if (status === '未到货') return 'bg-red-50 text-red-700 border border-red-200'
                  if (status === '部分到货') return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  return 'bg-green-50 text-green-700 border border-green-200'
                }

                return (
                  <tr key={`${item.contractNo}-${item.customerCode}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{(contractMeta.page - 1) * contractMeta.pageSize + index + 1}</td>
                    <td className="px-4 py-3 font-medium">{item.contractNo || '-'}</td>
                    <td className="px-4 py-3">{item.orderYear || '-'}</td>
                    <td className="px-4 py-3">{formatOrderDate(item.orderDate)}</td>
                    <td className="px-4 py-3">{item.customerCode || '-'}</td>
                    <td className="px-4 py-3">{formatNumber(item.totalQuantity)}</td>
                    <td className="px-4 py-3">{formatMoney(item.totalAmount)}</td>
                    <td className="px-4 py-3">
                      {item.arrivalStatus === '未到货' ? (
                        <span className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${getStatusColor(item.arrivalStatus)}`}>
                          {item.arrivalStatus}
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelectedArrivalHistory(item.arrivalHistory)}
                          className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer hover:opacity-80 transition ${getStatusColor(item.arrivalStatus)}`}
                        >
                          {item.arrivalStatus} ({item.arrivalRatio}%)
                          {Number(item.arrivalRatio || 0) > 100 ? ' · 异常' : ''}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatNumber(item.arrivalQuantity)}</td>
                    <td className="px-4 py-3">{formatMoney(item.arrivalAmount)}</td>
                    <td className="px-4 py-3">{formatMoney(item.notArrivalAmount)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openContractDetail(item)}
                        className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        详情
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!contracts.length && <div className="px-5 py-8 text-sm text-slate-500">没有匹配到合同数据。</div>}
        </div>
      )}
      {renderPagination(contractMeta, setContractPage)}
    </div>
  )
}
