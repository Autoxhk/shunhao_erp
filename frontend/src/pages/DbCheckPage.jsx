export default function DbCheckPage({ ctx }) {
  const {
    dbCheck,
    dbCheckTab,
    setDbCheckTab,
    loadDbCheck,
    dbCheckLoading,
    formatNumber,
    formatMoney,
    showDbSearch,
    showDbFilter,
    resetDbFilters,
    dbOrderMeta,
    dbOrderFilterVisible,
    dbOrderPanelType,
    dbOrderSearchLevels,
    updateDbCondition,
    addDbCondition,
    dbOrderPrimarySearched,
    removeDbCondition,
    dbOrderConditions,
    dbOrderFilterFields,
    dbOrderFilterOptions,
    dbOrderLoading,
    dbOrderRows,
    formatPartCode,
    openDbEditModal,
    deleteDbRecord,
    dbOrderPage,
    setDbOrderPage,
    dbArrivalMeta,
    dbArrivalFilterVisible,
    dbArrivalPanelType,
    dbArrivalSearchLevels,
    dbArrivalPrimarySearched,
    dbArrivalConditions,
    dbArrivalFilterFields,
    dbArrivalFilterOptions,
    dbArrivalLoading,
    dbArrivalRows,
    dbArrivalPage,
    setDbArrivalPage,
  } = ctx

  const summary = dbCheck?.summary || {}
  const sourceFileStats = dbCheck?.sourceFileStats || []
  const tabCls = (key) => `rounded-lg px-4 py-2 text-sm font-medium transition ${
    dbCheckTab === key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
  }`
  const totalOrderPages = Math.ceil(dbOrderMeta.total / dbOrderMeta.pageSize) || 1
  const totalArrivalPages = Math.ceil(dbArrivalMeta.total / dbArrivalMeta.pageSize) || 1

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <button className={tabCls('overview')} onClick={() => setDbCheckTab('overview')}>概览</button>
          <button className={tabCls('orders')} onClick={() => setDbCheckTab('orders')}>订单数据</button>
          <button className={tabCls('arrivals')} onClick={() => setDbCheckTab('arrivals')}>到货数据</button>
        </div>
        <button onClick={loadDbCheck} disabled={dbCheckLoading} className="ml-auto rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-60">
          {dbCheckLoading ? '刷新中...' : '刷新统计'}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><div className="text-sm text-slate-500">订单行数</div><div className="mt-1 text-xl font-semibold">{formatNumber(summary.orderRows)}</div></div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><div className="text-sm text-slate-500">到货行数</div><div className="mt-1 text-xl font-semibold">{formatNumber(summary.arrivalRows)}</div></div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><div className="text-sm text-slate-500">合同数</div><div className="mt-1 text-xl font-semibold">{formatNumber(summary.contractCount)}</div></div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><div className="text-sm text-slate-500">客户数</div><div className="mt-1 text-xl font-semibold">{formatNumber(summary.customerCount)}</div></div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><div className="text-sm text-slate-500">到货文件数</div><div className="mt-1 text-xl font-semibold">{formatNumber(summary.arrivalFileCount)}</div></div>
        <div className={`rounded-2xl p-4 shadow-sm ring-1 ${summary.importedArrivalRows > 0 ? 'bg-amber-50 ring-amber-300' : 'bg-white ring-slate-200'}`}><div className="text-sm text-slate-500">_imported 记录</div><div className="mt-1 text-xl font-semibold">{formatNumber(summary.importedArrivalRows)}</div></div>
      </div>

      {!!dbCheck?.message && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{dbCheck.message}</div>}

      {dbCheckTab === 'overview' && (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-5 py-4"><h3 className="text-base font-semibold">到货来源文件分布（前30）</h3></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-3">来源文件</th><th className="px-4 py-3">记录数</th></tr></thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sourceFileStats.map((item, idx) => (
                  <tr key={`sf-${idx}`}><td className="px-4 py-3">{item.sourceFile || '-'}</td><td className="px-4 py-3">{formatNumber(item.rows)}</td></tr>
                ))}
              </tbody>
            </table>
            {!sourceFileStats.length && <div className="px-5 py-8 text-sm text-slate-500">暂无来源文件统计。</div>}
          </div>
        </div>
      )}

      {dbCheckTab === 'orders' && (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="space-y-4 border-b border-slate-200 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold">订单数据（共 {formatNumber(dbOrderMeta.total)} 条）</h3>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => showDbSearch('order')} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500">搜索</button>
                <button onClick={() => showDbFilter('order')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">筛选</button>
                <button onClick={() => resetDbFilters('order')} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm hover:bg-slate-200">重置</button>
              </div>
            </div>
            {dbOrderFilterVisible && (
              <>
                {dbOrderPanelType === 'search' ? (
                  <>
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">最多支持 3 级搜索。先完成第 1 级搜索，再添加第 2、3 级条件。</div>
                    <div className="space-y-3">
                      {dbOrderSearchLevels.map((value, index) => (
                        <div key={`order-level-${index}`} className="flex flex-wrap items-center gap-3">
                          <div className="w-8 text-sm font-semibold text-slate-500">{index + 1}.</div>
                          <input type="text" placeholder={`第 ${index + 1} 级搜索：对当前结果继续全文筛选...`} value={value} onChange={(e) => updateDbCondition('order', index, e.target.value)} className="w-full max-w-xl flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                          {index === dbOrderSearchLevels.length - 1 && <button onClick={() => addDbCondition('order')} disabled={!dbOrderPrimarySearched || dbOrderSearchLevels.length >= 3} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">+ 添加条件</button>}
                          {index > 0 && <button onClick={() => removeDbCondition('order', index)} className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100">删除条件</button>}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">筛选模式：选择表头字段和字段值（类似 Excel）。</div>
                    <div className="space-y-3">
                      {dbOrderConditions.map((condition, index) => (
                        <div key={`order-filter-${index}`} className="flex flex-wrap items-center gap-3">
                          <div className="w-8 text-sm font-semibold text-slate-500">{index + 1}.</div>
                          <select value={condition.field} onChange={(e) => updateDbCondition('order', index, e.target.value, 'field')} className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">{dbOrderFilterFields.map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}</select>
                          <select multiple value={condition.value || []} onChange={(e) => updateDbCondition('order', index, Array.from(e.target.selectedOptions).map((opt) => opt.value), 'value')} className="h-28 w-full max-w-xl flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">{(dbOrderFilterOptions[condition.field] || []).map((value) => (<option key={`${condition.field}-${value}`} value={value}>{value}</option>))}</select>
                          {index === dbOrderConditions.length - 1 && <button onClick={() => addDbCondition('order')} disabled={dbOrderConditions.length >= 3} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">+ 添加条件</button>}
                          {index > 0 && <button onClick={() => removeDbCondition('order', index)} className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100">删除条件</button>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <div className="overflow-x-auto">
            {dbOrderLoading ? <div className="px-5 py-10 text-sm text-slate-500">加载中...</div> : (
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-3 py-3">ID</th><th className="px-3 py-3">客户</th><th className="px-3 py-3">合同号</th><th className="px-3 py-3">序号</th><th className="px-3 py-3">零件号</th><th className="px-3 py-3">互换零件号</th><th className="px-3 py-3">零件名</th><th className="px-3 py-3">个数</th><th className="px-3 py-3">单价</th><th className="px-3 py-3">总价</th><th className="px-3 py-3">操作</th></tr></thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {dbOrderRows.map((item) => (
                    <tr key={`dbo-${item.id}`} className="hover:bg-slate-50"><td className="px-3 py-2.5 text-slate-400">{item.id}</td><td className="px-3 py-2.5">{item.customerCode || '-'}</td><td className="px-3 py-2.5">{item.contractNo || '-'}</td><td className="px-3 py-2.5">{item.sequence || '-'}</td><td className="px-3 py-2.5">{formatPartCode(item.partNo)}</td><td className="px-3 py-2.5">{formatPartCode(item.interchangePartNo)}</td><td className="px-3 py-2.5">{item.partName || '-'}</td><td className="px-3 py-2.5">{formatNumber(item.quantity)}</td><td className="px-3 py-2.5">{formatMoney(item.unitPrice)}</td><td className="px-3 py-2.5">{formatMoney(item.totalPrice)}</td><td className="px-3 py-2.5"><div className="flex gap-1"><button onClick={() => openDbEditModal('order', 'edit', item)} className="rounded px-2 py-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100">编辑</button><button onClick={() => deleteDbRecord('order', item.id)} className="rounded px-2 py-1 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100">删除</button></div></td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {!dbOrderRows.length && !dbOrderLoading && <div className="px-5 py-8 text-sm text-slate-500">暂无数据。</div>}
          </div>
          {dbOrderMeta.total > dbOrderMeta.pageSize && (
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm text-slate-600">
              <span>共 {formatNumber(dbOrderMeta.total)} 条，第 {dbOrderPage} / {totalOrderPages} 页</span>
              <div className="flex gap-2">
                <button disabled={dbOrderPage <= 1} onClick={() => setDbOrderPage((p) => p - 1)} className="rounded-lg bg-slate-100 px-3 py-1 disabled:opacity-40 hover:bg-slate-200">上一页</button>
                <button disabled={dbOrderPage >= totalOrderPages} onClick={() => setDbOrderPage((p) => p + 1)} className="rounded-lg bg-slate-100 px-3 py-1 disabled:opacity-40 hover:bg-slate-200">下一页</button>
              </div>
            </div>
          )}
        </div>
      )}

      {dbCheckTab === 'arrivals' && (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="space-y-4 border-b border-slate-200 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold">到货数据（共 {formatNumber(dbArrivalMeta.total)} 条）</h3>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => showDbSearch('arrival')} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500">搜索</button>
                <button onClick={() => showDbFilter('arrival')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">筛选</button>
                <button onClick={() => resetDbFilters('arrival')} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm hover:bg-slate-200">重置</button>
              </div>
            </div>
            {dbArrivalFilterVisible && (
              <>
                {dbArrivalPanelType === 'search' ? (
                  <>
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">最多支持 3 级搜索。先完成第 1 级搜索，再添加第 2、3 级条件。</div>
                    <div className="space-y-3">
                      {dbArrivalSearchLevels.map((value, index) => (
                        <div key={`arrival-level-${index}`} className="flex flex-wrap items-center gap-3">
                          <div className="w-8 text-sm font-semibold text-slate-500">{index + 1}.</div>
                          <input type="text" placeholder={`第 ${index + 1} 级搜索：对当前结果继续全文筛选...`} value={value} onChange={(e) => updateDbCondition('arrival', index, e.target.value)} className="w-full max-w-xl flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                          {index === dbArrivalSearchLevels.length - 1 && <button onClick={() => addDbCondition('arrival')} disabled={!dbArrivalPrimarySearched || dbArrivalSearchLevels.length >= 3} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">+ 添加条件</button>}
                          {index > 0 && <button onClick={() => removeDbCondition('arrival', index)} className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100">删除条件</button>}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">筛选模式：选择表头字段和字段值（类似 Excel）。</div>
                    <div className="space-y-3">
                      {dbArrivalConditions.map((condition, index) => (
                        <div key={`arrival-filter-${index}`} className="flex flex-wrap items-center gap-3">
                          <div className="w-8 text-sm font-semibold text-slate-500">{index + 1}.</div>
                          <select value={condition.field} onChange={(e) => updateDbCondition('arrival', index, e.target.value, 'field')} className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">{dbArrivalFilterFields.map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}</select>
                          <select multiple value={condition.value || []} onChange={(e) => updateDbCondition('arrival', index, Array.from(e.target.selectedOptions).map((opt) => opt.value), 'value')} className="h-28 w-full max-w-xl flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">{(dbArrivalFilterOptions[condition.field] || []).map((value) => (<option key={`${condition.field}-${value}`} value={value}>{value}</option>))}</select>
                          {index === dbArrivalConditions.length - 1 && <button onClick={() => addDbCondition('arrival')} disabled={dbArrivalConditions.length >= 3} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">+ 添加条件</button>}
                          {index > 0 && <button onClick={() => removeDbCondition('arrival', index)} className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100">删除条件</button>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <div className="overflow-x-auto">
            {dbArrivalLoading ? <div className="px-5 py-10 text-sm text-slate-500">加载中...</div> : (
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-3 py-3">ID</th><th className="px-3 py-3">到货日期</th><th className="px-3 py-3">客户</th><th className="px-3 py-3">合同号</th><th className="px-3 py-3">序号</th><th className="px-3 py-3">零件号</th><th className="px-3 py-3">零件名</th><th className="px-3 py-3">个数</th><th className="px-3 py-3">单价</th><th className="px-3 py-3">来源文件</th><th className="px-3 py-3">操作</th></tr></thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {dbArrivalRows.map((item) => (
                    <tr key={`dba-${item.id}`} className="hover:bg-slate-50"><td className="px-3 py-2.5 text-slate-400">{item.id}</td><td className="px-3 py-2.5">{item.arrivalDate || '-'}</td><td className="px-3 py-2.5">{item.customerCode || '-'}</td><td className="px-3 py-2.5">{item.contractNo || '-'}</td><td className="px-3 py-2.5">{item.sequence || '-'}</td><td className="px-3 py-2.5">{formatPartCode(item.partNo)}</td><td className="px-3 py-2.5">{item.partName || '-'}</td><td className="px-3 py-2.5">{formatNumber(item.quantity)}</td><td className="px-3 py-2.5">{formatMoney(item.unitPrice)}</td><td className="px-3 py-2.5 max-w-[160px] truncate text-slate-500" title={item.sourceFile}>{item.sourceFile || '-'}</td><td className="px-3 py-2.5"><div className="flex gap-1"><button onClick={() => openDbEditModal('arrival', 'edit', item)} className="rounded px-2 py-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100">编辑</button><button onClick={() => deleteDbRecord('arrival', item.id)} className="rounded px-2 py-1 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100">删除</button></div></td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {!dbArrivalRows.length && !dbArrivalLoading && <div className="px-5 py-8 text-sm text-slate-500">暂无数据。</div>}
          </div>
          {dbArrivalMeta.total > dbArrivalMeta.pageSize && (
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm text-slate-600">
              <span>共 {formatNumber(dbArrivalMeta.total)} 条，第 {dbArrivalPage} / {totalArrivalPages} 页</span>
              <div className="flex gap-2">
                <button disabled={dbArrivalPage <= 1} onClick={() => setDbArrivalPage((p) => p - 1)} className="rounded-lg bg-slate-100 px-3 py-1 disabled:opacity-40 hover:bg-slate-200">上一页</button>
                <button disabled={dbArrivalPage >= totalArrivalPages} onClick={() => setDbArrivalPage((p) => p + 1)} className="rounded-lg bg-slate-100 px-3 py-1 disabled:opacity-40 hover:bg-slate-200">下一页</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
