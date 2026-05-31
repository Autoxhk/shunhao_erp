export default function CustomersPage({ ctx }) {
  const {
    customerSearch,
    setCustomerSearch,
    setCustomerPage,
    customersLoading,
    customers,
    customerMeta,
    formatNumber,
    formatMoney,
    openCustomerAnalysis,
    renderPagination,
  } = ctx

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">客户信息</h2>
            <p className="text-sm text-slate-500">查看每个客户的合同数、订单行数、最近下单时间和累计金额。</p>
          </div>
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            placeholder="搜索客户代码"
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value)
              setCustomerPage(1)
            }}
          />
        </div>
      </div>

      {customersLoading ? (
        <div className="px-5 py-10 text-sm text-slate-500">正在加载客户数据...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">序号</th>
                <th className="px-4 py-3">客户代码</th>
                <th className="px-4 py-3">合同数</th>
                <th className="px-4 py-3">零件条目数</th>
                <th className="px-4 py-3">最近下单合同时间</th>
                <th className="px-4 py-3">累计金额</th>
                <th className="px-4 py-3">详情分析</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {customers.map((item, index) => (
                <tr key={item.customerCode} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{(customerMeta.page - 1) * customerMeta.pageSize + index + 1}</td>
                  <td className="px-4 py-3 font-medium">{item.customerCode || '-'}</td>
                  <td className="px-4 py-3">{formatNumber(item.contractCount)}</td>
                  <td className="px-4 py-3">{formatNumber(item.orderCount)}</td>
                  <td className="px-4 py-3">{item.latestContractTime || '-'}</td>
                  <td className="px-4 py-3">{formatMoney(item.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openCustomerAnalysis(item)}
                      className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                      详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!customers.length && <div className="px-5 py-8 text-sm text-slate-500">没有匹配到客户数据。</div>}
        </div>
      )}
      {renderPagination(customerMeta, setCustomerPage)}
    </div>
  )
}
