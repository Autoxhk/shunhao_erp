import { useEffect, useState } from 'react'

export default function DashboardPage({ ctx }) {
  const { statCards, stats, formatMoney, formatNumber, formatPartCode, apiFetch } = ctx
  const currentYear = String(new Date().getFullYear())

  const [latestContracts, setLatestContracts] = useState([])
  const [topCustomers, setTopCustomers] = useState([])
  const [topParts, setTopParts] = useState([])
  const [arrivalSummary, setArrivalSummary] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadDashboardBlocks() {
      try {
        const dashboardRes = await apiFetch(`/api/dashboard?year=${currentYear}`)
        const dashboardJson = await dashboardRes.json()

        if (cancelled) return

        setLatestContracts(dashboardJson.latestContracts || [])
        setTopCustomers(dashboardJson.topCustomers || [])
        setArrivalSummary(dashboardJson.arrivalSummary || null)
        setTopParts(dashboardJson.topParts || [])
      } catch {
        if (cancelled) return
        setLatestContracts([])
        setTopCustomers([])
        setArrivalSummary(null)
        setTopParts([])
      }
    }

    loadDashboardBlocks()
    return () => {
      cancelled = true
    }
  }, [apiFetch, currentYear])

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => (
          <div key={card.key} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {card.type === 'money' ? formatMoney(stats[card.key]) : formatNumber(stats[card.key])}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold">{currentYear}年最新下单合同（前8）</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">合同号</th>
                  <th className="px-4 py-3">客户</th>
                  <th className="px-4 py-3">总金额</th>
                  <th className="px-4 py-3">到货状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {latestContracts.map((item) => (
                  <tr key={`${item.contractNo}-${item.customerCode}`}>
                    <td className="px-4 py-3 font-medium">{item.contractNo || '-'}</td>
                    <td className="px-4 py-3">{item.customerCode || '-'}</td>
                    <td className="px-4 py-3">{formatMoney(item.totalAmount)}</td>
                    <td className="px-4 py-3">{item.arrivalStatus || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!latestContracts.length && <div className="px-5 py-8 text-sm text-slate-500">暂无合同数据。</div>}
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold">{currentYear}年客户信息统计（前8）</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">客户</th>
                  <th className="px-4 py-3">合同数</th>
                  <th className="px-4 py-3">订单行数</th>
                  <th className="px-4 py-3">累计金额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {topCustomers.map((item, index) => (
                  <tr key={`${item.customerCode || 'na'}-${index}`}>
                    <td className="px-4 py-3 font-medium">{item.customerCode || '-'}</td>
                    <td className="px-4 py-3">{formatNumber(item.contractCount)}</td>
                    <td className="px-4 py-3">{formatNumber(item.orderCount)}</td>
                    <td className="px-4 py-3">{formatMoney(item.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!topCustomers.length && <div className="px-5 py-8 text-sm text-slate-500">暂无客户统计数据。</div>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-base font-semibold">{currentYear}年到货统计</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3 text-sm"><div className="text-slate-500">到货文件数</div><div className="mt-1 text-lg font-semibold">{formatNumber(arrivalSummary?.totalFiles)}</div></div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm"><div className="text-slate-500">总到货行数</div><div className="mt-1 text-lg font-semibold">{formatNumber(arrivalSummary?.totalRows)}</div></div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm"><div className="text-slate-500">错误行数</div><div className="mt-1 text-lg font-semibold text-rose-700">{formatNumber(arrivalSummary?.errorRows)}</div></div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm"><div className="text-slate-500">错误率</div><div className="mt-1 text-lg font-semibold">{arrivalSummary?.errorRate ?? 0}%</div></div>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-base font-semibold">{currentYear}年下单占比较高的零件（前8）</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">零件号</th>
                  <th className="px-4 py-3">零件名</th>
                  <th className="px-4 py-3">累计金额</th>
                  <th className="px-4 py-3">占比</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {topParts.map((item, index) => (
                  <tr key={`${item.partNo || 'na'}-${index}`}>
                    <td className="px-4 py-3 font-medium">{formatPartCode(item.partNo)}</td>
                    <td className="px-4 py-3">{item.partName || '-'}</td>
                    <td className="px-4 py-3">{formatMoney(item.totalAmount)}</td>
                    <td className="px-4 py-3">{Number(item.ratio || 0).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!topParts.length && <div className="px-5 py-8 text-sm text-slate-500">暂无零件统计数据。</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
