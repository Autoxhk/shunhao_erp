import { useEffect, useMemo, useState } from 'react'

// ── Authenticated fetch ───────────────────────────────────────────────────────
function getAuthToken() {
  return localStorage.getItem('authToken')
}

async function apiFetch(url, options = {}) {
  const token = getAuthToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (res.status === 401 && !url.includes('/api/login')) {
    localStorage.removeItem('authToken')
    window.dispatchEvent(new Event('auth:unauthorized'))
    throw new Error('Unauthorized')
  }
  return res
}
// ─────────────────────────────────────────────────────────────────────────────

const emptyStats = {
  totalOrders: 0,
  totalCustomers: 0,
  totalContracts: 0,
  totalAmount: 0,
  topCustomers: [],
}

const navItems = [
  { key: 'dashboard', label: 'Dashboard', desc: '总体概览' },
  { key: 'contracts', label: '合同信息', desc: '合同汇总' },
  { key: 'customers', label: '客户信息', desc: '客户汇总' },
  { key: 'parts', label: '零件信息', desc: '零件汇总' },
  { key: 'arrival', label: '到货信息', desc: '到货核对统计' },
  { key: 'upload', label: '上传数据', desc: '上传合同表 / 到货表' },
  { key: 'dbcheck', label: '数据库检查', desc: '查看数据库内容' },
]

const statCards = [
  { key: 'totalOrders', label: '历史订单数', type: 'number' },
  { key: 'totalCustomers', label: '客户数量', type: 'number' },
  { key: 'totalContracts', label: '合同数量', type: 'number' },
  { key: 'totalAmount', label: '累计总价', type: 'money' },
]

const dbOrderFilterFields = [
  { value: 'contractNo', label: '合同号' },
  { value: 'customerCode', label: '客户代码' },
  { value: 'sequence', label: '序号' },
  { value: 'partNo', label: '零件号' },
  { value: 'interchangePartNo', label: '互换零件号' },
  { value: 'partName', label: '零件名' },
  { value: 'partNameCn', label: '零件名（中文）' },
]

const dbArrivalFilterFields = [
  { value: 'sourceFile', label: '来源文件' },
  { value: 'arrivalDate', label: '到货日期' },
  { value: 'contractNo', label: '合同号' },
  { value: 'customerCode', label: '客户代码' },
  { value: 'sequence', label: '序号' },
  { value: 'partNo', label: '零件号' },
  { value: 'interchangePartNo', label: '互换零件号' },
  { value: 'partName', label: '零件名' },
]

const numberFormatter = new Intl.NumberFormat('en-US')
const moneyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '-'
  return numberFormatter.format(Number(value))
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '-'
  return moneyFormatter.format(Number(value))
}

function formatPartCode(value) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value).replace(/\.0+$/, '')
}

function formatOrderDate(value) {
  if (!value) return '-'
  const text = String(value)
  return text.length === 4 ? `${text.slice(0, 2)}-${text.slice(2)}` : text
}

function formatYoYChange(current, previous) {
  const prev = Number(previous || 0)
  if (!prev) return '—'
  const rate = ((Number(current || 0) - prev) / prev) * 100
  return `${rate >= 0 ? '+' : ''}${rate.toFixed(1)}%`
}

export default function App() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken'))
  const [loginCode, setLoginCode] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    function handleUnauthorized() {
      setAuthToken(null)
      setLoginCode('')
      setLoginError('登录已失效，请重新输入访问码')
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    if (!loginCode.trim()) return
    setLoginLoading(true)
    setLoginError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: loginCode.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('authToken', data.token)
        setAuthToken(data.token)
        setLoginCode('')
      } else {
        setLoginError(data.message || '登录码错误')
      }
    } catch {
      setLoginError('网络错误，请重试')
    } finally {
      setLoginLoading(false)
    }
  }

  function handleLogout() {
    const token = getAuthToken()
    if (token) apiFetch('/api/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('authToken')
    setAuthToken(null)
    setLoginCode('')
    setLoginError('')
  }

  const [activeView, setActiveView] = useState('dashboard')
  const [stats, setStats] = useState(emptyStats)
  const [orders, setOrders] = useState([])
  const [contracts, setContracts] = useState([])
  const [customers, setCustomers] = useState([])
  const [parts, setParts] = useState([])
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [contractsLoading, setContractsLoading] = useState(false)
  const [customersLoading, setCustomersLoading] = useState(false)
  const [partsLoading, setPartsLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [filters, setFilters] = useState({ customer: '', contract: '', part: '' })
  const [contractSearch, setContractSearch] = useState('')
  const [contractYearFilter, setContractYearFilter] = useState('')
  const [availableContractYears, setAvailableContractYears] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [partSearch, setPartSearch] = useState('')
  const [contractPage, setContractPage] = useState(1)
  const [customerPage, setCustomerPage] = useState(1)
  const [partPage, setPartPage] = useState(1)
  const [contractMeta, setContractMeta] = useState({ total: 0, page: 1, pageSize: 25 })
  const [customerMeta, setCustomerMeta] = useState({ total: 0, page: 1, pageSize: 25 })
  const [partMeta, setPartMeta] = useState({ total: 0, page: 1, pageSize: 25 })
  const [selectedContract, setSelectedContract] = useState(null)
  const [contractDetailItems, setContractDetailItems] = useState([])
  const [contractDetailLoading, setContractDetailLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerAnalysis, setCustomerAnalysis] = useState(null)
  const [customerAnalysisLoading, setCustomerAnalysisLoading] = useState(false)
  const [selectedCustomerYear, setSelectedCustomerYear] = useState(null)
  const [selectedPart, setSelectedPart] = useState(null)
  const [partAnalysis, setPartAnalysis] = useState(null)
  const [partAnalysisLoading, setPartAnalysisLoading] = useState(false)
  const [selectedPartYear, setSelectedPartYear] = useState(null)
  const [arrivalAnalysis, setArrivalAnalysis] = useState(null)
  const [arrivalLoading, setArrivalLoading] = useState(false)
  const [arrivalTab, setArrivalTab] = useState('all')
  const [arrivalMainTab, setArrivalMainTab] = useState('detail')
  const [selectedArrivalHistory, setSelectedArrivalHistory] = useState(null)
  const [selectedArrivalFileDetail, setSelectedArrivalFileDetail] = useState(null)
  const [arrivalFileDetailLoading, setArrivalFileDetailLoading] = useState(false)
  const [dbCheck, setDbCheck] = useState(null)
  const [dbCheckLoading, setDbCheckLoading] = useState(false)
  const [dbCheckTab, setDbCheckTab] = useState('overview')
  const [dbOrderRows, setDbOrderRows] = useState([])
  const [dbOrderMeta, setDbOrderMeta] = useState({ total: 0, page: 1, pageSize: 30 })
  const [dbOrderSearchLevels, setDbOrderSearchLevels] = useState([''])
  const [dbOrderPrimarySearched, setDbOrderPrimarySearched] = useState(false)
  const [dbOrderFilterVisible, setDbOrderFilterVisible] = useState(false)
  const [dbOrderPanelType, setDbOrderPanelType] = useState('search')
  const [dbOrderConditions, setDbOrderConditions] = useState([{ field: dbOrderFilterFields[0].value, value: [] }])
  const [dbOrderFilterOptions, setDbOrderFilterOptions] = useState({})
  const [dbOrderPage, setDbOrderPage] = useState(1)
  const [dbOrderLoading, setDbOrderLoading] = useState(false)
  const [dbArrivalRows, setDbArrivalRows] = useState([])
  const [dbArrivalMeta, setDbArrivalMeta] = useState({ total: 0, page: 1, pageSize: 30 })
  const [dbArrivalSearchLevels, setDbArrivalSearchLevels] = useState([''])
  const [dbArrivalPrimarySearched, setDbArrivalPrimarySearched] = useState(false)
  const [dbArrivalFilterVisible, setDbArrivalFilterVisible] = useState(false)
  const [dbArrivalPanelType, setDbArrivalPanelType] = useState('search')
  const [dbArrivalConditions, setDbArrivalConditions] = useState([{ field: dbArrivalFilterFields[0].value, value: [] }])
  const [dbArrivalFilterOptions, setDbArrivalFilterOptions] = useState({})
  const [dbArrivalPage, setDbArrivalPage] = useState(1)
  const [dbArrivalLoading, setDbArrivalLoading] = useState(false)
  const [dbEditModal, setDbEditModal] = useState(null)
  const [dbEditForm, setDbEditForm] = useState({})
  const [dbEditSaving, setDbEditSaving] = useState(false)

  const [uploadOrderFile, setUploadOrderFile] = useState(null)
  const [uploadOrderStatus, setUploadOrderStatus] = useState(null)
  const [uploadOrderLoading, setUploadOrderLoading] = useState(false)
  const [uploadArrivalFiles, setUploadArrivalFiles] = useState([])
  const [uploadArrivalStatus, setUploadArrivalStatus] = useState(null)
  const [uploadArrivalLoading, setUploadArrivalLoading] = useState(false)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.customer) params.set('customer', filters.customer)
    if (filters.contract) params.set('contract', filters.contract)
    if (filters.part) params.set('part', filters.part)
    params.set('pageSize', '20')
    return params.toString()
  }, [filters])

  async function loadDashboard() {
    setDashboardLoading(true)
    try {
      const [statsRes, ordersRes] = await Promise.all([
        apiFetch('/api/stats'),
        apiFetch(`/api/orders?${queryString}`),
      ])
      const statsJson = await statsRes.json()
      const ordersJson = await ordersRes.json()
      setStats(statsJson)
      setOrders(ordersJson.items || [])
    } finally {
      setDashboardLoading(false)
    }
  }

  async function loadContracts() {
    setContractsLoading(true)
    try {
      const params = new URLSearchParams({ pageSize: '25', page: String(contractPage) })
      if (contractSearch) params.set('search', contractSearch)
      if (contractYearFilter) params.set('year', contractYearFilter)
      const response = await apiFetch(`/api/contracts?${params.toString()}`)
      const json = await response.json()
      setContracts(json.items || [])
      setAvailableContractYears(json.availableYears || [])
      setContractMeta({
        total: json.total || 0,
        page: json.page || 1,
        pageSize: json.pageSize || 25,
      })
    } finally {
      setContractsLoading(false)
    }
  }

  async function loadCustomers() {
    setCustomersLoading(true)
    try {
      const params = new URLSearchParams({ pageSize: '25', page: String(customerPage) })
      if (customerSearch) params.set('search', customerSearch)
      const response = await apiFetch(`/api/customers?${params.toString()}`)
      const json = await response.json()
      setCustomers(json.items || [])
      setCustomerMeta({
        total: json.total || 0,
        page: json.page || 1,
        pageSize: json.pageSize || 25,
      })
    } finally {
      setCustomersLoading(false)
    }
  }

  async function loadParts() {
    setPartsLoading(true)
    try {
      const params = new URLSearchParams({ pageSize: '25', page: String(partPage) })
      if (partSearch) params.set('search', partSearch)
      const response = await apiFetch(`/api/parts?${params.toString()}`)
      const json = await response.json()
      setParts(json.items || [])
      setPartMeta({
        total: json.total || 0,
        page: json.page || 1,
        pageSize: json.pageSize || 25,
      })
    } finally {
      setPartsLoading(false)
    }
  }

  useEffect(() => {
    if (!authToken) return
    loadDashboard()
  }, [authToken, queryString])

  useEffect(() => {
    if (!authToken) return
    if (activeView === 'contracts') loadContracts()
  }, [authToken, activeView, contractSearch, contractYearFilter, contractPage])

  useEffect(() => {
    if (!authToken) return
    if (activeView === 'customers') loadCustomers()
  }, [authToken, activeView, customerSearch, customerPage])

  useEffect(() => {
    if (!authToken) return
    if (activeView === 'parts') loadParts()
  }, [authToken, activeView, partSearch, partPage])

  useEffect(() => {
    if (!authToken) return
    if (activeView === 'arrival') {
      loadArrivalAnalysis()
    }
  }, [authToken, activeView])

  useEffect(() => {
    if (!authToken) return
    if (activeView === 'dbcheck') {
      loadDbCheck()
    }
  }, [authToken, activeView])

  useEffect(() => {
    if (!authToken) return
    if (activeView === 'dbcheck' && dbCheckTab === 'orders') loadDbOrders()
  }, [authToken, activeView, dbCheckTab, dbOrderPage])

  useEffect(() => {
    if (!authToken) return
    if (activeView === 'dbcheck' && dbCheckTab === 'arrivals') loadDbArrivals()
  }, [authToken, activeView, dbCheckTab, dbArrivalPage])

  useEffect(() => {
    if (!authToken) return
    if (!(activeView === 'dbcheck' && dbCheckTab === 'orders' && dbOrderFilterVisible && dbOrderPanelType === 'search')) return
    const timer = setTimeout(() => {
      setDbOrderPrimarySearched(!!String(dbOrderSearchLevels[0] || '').trim())
      setDbOrderPage(1)
      loadDbOrders(1, dbOrderSearchLevels, [])
    }, 250)
    return () => clearTimeout(timer)
  }, [authToken, activeView, dbCheckTab, dbOrderFilterVisible, dbOrderPanelType, dbOrderSearchLevels])

  useEffect(() => {
    if (!authToken) return
    if (!(activeView === 'dbcheck' && dbCheckTab === 'orders' && dbOrderFilterVisible && dbOrderPanelType === 'filter')) return
    const timer = setTimeout(() => {
      setDbOrderPage(1)
      loadDbOrders(1, [], dbOrderConditions)
    }, 250)
    return () => clearTimeout(timer)
  }, [authToken, activeView, dbCheckTab, dbOrderFilterVisible, dbOrderPanelType, dbOrderConditions])

  useEffect(() => {
    if (!authToken) return
    if (!(activeView === 'dbcheck' && dbCheckTab === 'arrivals' && dbArrivalFilterVisible && dbArrivalPanelType === 'search')) return
    const timer = setTimeout(() => {
      setDbArrivalPrimarySearched(!!String(dbArrivalSearchLevels[0] || '').trim())
      setDbArrivalPage(1)
      loadDbArrivals(1, dbArrivalSearchLevels, [])
    }, 250)
    return () => clearTimeout(timer)
  }, [authToken, activeView, dbCheckTab, dbArrivalFilterVisible, dbArrivalPanelType, dbArrivalSearchLevels])

  useEffect(() => {
    if (!authToken) return
    if (!(activeView === 'dbcheck' && dbCheckTab === 'arrivals' && dbArrivalFilterVisible && dbArrivalPanelType === 'filter')) return
    const timer = setTimeout(() => {
      setDbArrivalPage(1)
      loadDbArrivals(1, [], dbArrivalConditions)
    }, 250)
    return () => clearTimeout(timer)
  }, [authToken, activeView, dbCheckTab, dbArrivalFilterVisible, dbArrivalPanelType, dbArrivalConditions])

  async function handleSync() {
    setSyncing(true)
    await apiFetch('/api/sync', { method: 'POST' })
    await Promise.all([loadDashboard(), loadContracts(), loadCustomers(), loadParts(), loadArrivalAnalysis(), loadDbCheck()])
    setSyncing(false)
  }

  async function loadArrivalAnalysis() {
    setArrivalLoading(true)
    try {
      const response = await apiFetch(`/api/arrival-analysis?_t=${Date.now()}`)
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.message || '到货检查失败')
      }
      setArrivalAnalysis(json)
    } catch (error) {
      setArrivalAnalysis({
        summary: { totalRows: 0, checkedRows: 0, correctRows: 0, errorRows: 0, errorRate: 0, totalFiles: 0 },
        errorFieldStats: [],
        checks: [],
        errors: [],
        message: error.message,
      })
    } finally {
      setArrivalLoading(false)
    }
  }

  async function loadDbCheck() {
    setDbCheckLoading(true)
    try {
      const response = await apiFetch(`/api/db-check?_t=${Date.now()}`)
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.message || '数据库检查失败')
      }
      setDbCheck(json)
    } catch (error) {
      setDbCheck({
        summary: {
          orderRows: 0,
          arrivalRows: 0,
          contractCount: 0,
          customerCount: 0,
          arrivalFileCount: 0,
          importedArrivalRows: 0,
        },
        sourceFileStats: [],
        latestOrders: [],
        latestArrivals: [],
        message: error.message,
      })
    } finally {
      setDbCheckLoading(false)
    }
  }

  function normalizeDbSearchLevels(levels) {
    return (levels || []).map((item) => String(item || '').trim()).filter(Boolean)
  }

  function normalizeDbConditions(conditions) {
    return (conditions || []).filter((item) => item?.field && Array.isArray(item?.value) && item.value.length > 0)
  }

  async function loadDbFilterOptions(type, field) {
    if (!field) return
    const optionsState = type === 'order' ? dbOrderFilterOptions : dbArrivalFilterOptions
    if (optionsState[field]) return
    const params = new URLSearchParams({ type, field })
    const res = await apiFetch(`/api/db-filter-options?${params.toString()}`)
    const json = await res.json()
    const values = json.items || []
    if (type === 'order') {
      setDbOrderFilterOptions((prev) => ({ ...prev, [field]: values }))
    } else {
      setDbArrivalFilterOptions((prev) => ({ ...prev, [field]: values }))
    }
  }

  function addDbCondition(type) {
    if (type === 'order' && dbOrderPanelType === 'search') {
      setDbOrderSearchLevels((prev) => (prev.length >= 3 ? prev : [...prev, '']))
      return
    }
    if (type === 'arrival' && dbArrivalPanelType === 'search') {
      setDbArrivalSearchLevels((prev) => (prev.length >= 3 ? prev : [...prev, '']))
      return
    }
    if (type === 'order') {
      if (dbOrderConditions.length >= 3) return
      const field = dbOrderFilterFields[0].value
      setDbOrderConditions((prev) => [...prev, { field, value: [] }])
      loadDbFilterOptions('order', field)
      return
    }
    if (dbArrivalConditions.length >= 3) return
    const field = dbArrivalFilterFields[0].value
    setDbArrivalConditions((prev) => [...prev, { field, value: [] }])
    loadDbFilterOptions('arrival', field)
  }

  function updateDbCondition(type, index, value, key = 'value') {
    if (type === 'order' && dbOrderPanelType === 'search') {
      setDbOrderSearchLevels((prev) => prev.map((item, idx) => (idx === index ? value : item)))
      return
    }
    if (type === 'arrival' && dbArrivalPanelType === 'search') {
      setDbArrivalSearchLevels((prev) => prev.map((item, idx) => (idx === index ? value : item)))
      return
    }

    const setter = type === 'order' ? setDbOrderConditions : setDbArrivalConditions
    setter((prev) => prev.map((item, idx) => {
      if (idx !== index) return item
      if (key === 'field') return { ...item, field: value, value: [] }
      return { ...item, value }
    }))
    if (key === 'field') {
      loadDbFilterOptions(type, value)
    }
  }

  function removeDbCondition(type, index) {
    if (type === 'order' && dbOrderPanelType === 'search') {
      setDbOrderSearchLevels((prev) => {
        const next = prev.filter((_, idx) => idx !== index)
        return next.length ? next : ['']
      })
      return
    }
    if (type === 'arrival' && dbArrivalPanelType === 'search') {
      setDbArrivalSearchLevels((prev) => {
        const next = prev.filter((_, idx) => idx !== index)
        return next.length ? next : ['']
      })
      return
    }
    const setter = type === 'order' ? setDbOrderConditions : setDbArrivalConditions
    const defaultField = type === 'order' ? dbOrderFilterFields[0].value : dbArrivalFilterFields[0].value
    setter((prev) => {
      const next = prev.filter((_, idx) => idx !== index)
      return next.length ? next : [{ field: defaultField, value: [] }]
    })
  }

  function showDbSearch(type) {
    if (type === 'order') {
      setDbOrderFilterVisible(true)
      setDbOrderPanelType('search')
      return
    }
    setDbArrivalFilterVisible(true)
    setDbArrivalPanelType('search')
  }

  function showDbFilter(type) {
    if (type === 'order') {
      setDbOrderFilterVisible(true)
      setDbOrderPanelType('filter')
      if (!dbOrderConditions.length) setDbOrderConditions([{ field: dbOrderFilterFields[0].value, value: [] }])
      loadDbFilterOptions('order', (dbOrderConditions[0]?.field || dbOrderFilterFields[0].value))
      return
    }
    setDbArrivalFilterVisible(true)
    setDbArrivalPanelType('filter')
    if (!dbArrivalConditions.length) setDbArrivalConditions([{ field: dbArrivalFilterFields[0].value, value: [] }])
    loadDbFilterOptions('arrival', (dbArrivalConditions[0]?.field || dbArrivalFilterFields[0].value))
  }

  function resetDbFilters(type) {
    if (type === 'order') {
      setDbOrderSearchLevels([''])
      setDbOrderPrimarySearched(false)
      setDbOrderFilterVisible(false)
      setDbOrderPanelType('search')
      setDbOrderConditions([{ field: dbOrderFilterFields[0].value, value: [] }])
      setDbOrderPage(1)
      loadDbOrders(1, [''], [])
      return
    }
    setDbArrivalSearchLevels([''])
    setDbArrivalPrimarySearched(false)
    setDbArrivalFilterVisible(false)
    setDbArrivalPanelType('search')
    setDbArrivalConditions([{ field: dbArrivalFilterFields[0].value, value: [] }])
    setDbArrivalPage(1)
    loadDbArrivals(1, [''], [])
  }

  async function loadDbOrders(pageOverride = dbOrderPage, searchLevelsOverride = dbOrderSearchLevels, conditionsOverride = dbOrderConditions) {
    setDbOrderLoading(true)
    try {
      const params = new URLSearchParams({ page: String(pageOverride), pageSize: '30' })
      const searchLevels = normalizeDbSearchLevels(searchLevelsOverride)
      const conditions = normalizeDbConditions(conditionsOverride)
      if (searchLevels.length) params.set('searches', JSON.stringify(searchLevels))
      if (conditions.length) params.set('conditions', JSON.stringify(conditions))
      const res = await apiFetch(`/api/db-orders?${params}`)
      const json = await res.json()
      setDbOrderRows(json.items || [])
      setDbOrderMeta({ total: json.total || 0, page: json.page || 1, pageSize: json.pageSize || 30 })
    } finally {
      setDbOrderLoading(false)
    }
  }

  async function loadDbArrivals(pageOverride = dbArrivalPage, searchLevelsOverride = dbArrivalSearchLevels, conditionsOverride = dbArrivalConditions) {
    setDbArrivalLoading(true)
    try {
      const params = new URLSearchParams({ page: String(pageOverride), pageSize: '30' })
      const searchLevels = normalizeDbSearchLevels(searchLevelsOverride)
      const conditions = normalizeDbConditions(conditionsOverride)
      if (searchLevels.length) params.set('searches', JSON.stringify(searchLevels))
      if (conditions.length) params.set('conditions', JSON.stringify(conditions))
      const res = await apiFetch(`/api/db-arrivals?${params}`)
      const json = await res.json()
      setDbArrivalRows(json.items || [])
      setDbArrivalMeta({ total: json.total || 0, page: json.page || 1, pageSize: json.pageSize || 30 })
    } finally {
      setDbArrivalLoading(false)
    }
  }

  function openDbEditModal(type, mode, record) {
    setDbEditModal({ type, mode })
    setDbEditForm(record ? { ...record } : {})
  }

  async function saveDbRecord() {
    if (!dbEditModal) return
    setDbEditSaving(true)
    try {
      const { type, mode } = dbEditModal
      const isAdd = mode === 'add'
      const url = isAdd
        ? (type === 'order' ? '/api/db-order' : '/api/db-arrival')
        : (type === 'order' ? `/api/db-order/${dbEditForm.id}` : `/api/db-arrival/${dbEditForm.id}`)
      const res = await fetch(url, { method: isAdd ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dbEditForm) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || '保存失败')
      setDbEditModal(null)
      if (type === 'order') { loadDbOrders(); loadDbCheck() }
      else { loadDbArrivals(); loadDbCheck() }
    } catch (e) {
      alert(e.message)
    } finally {
      setDbEditSaving(false)
    }
  }

  async function deleteDbRecord(type, id) {
    if (!confirm('确认删除该条记录？此操作不可撤销。')) return
    try {
      const url = type === 'order' ? `/api/db-order/${id}` : `/api/db-arrival/${id}`
      const res = await fetch(url, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || '删除失败')
      if (type === 'order') { loadDbOrders(); loadDbCheck() }
      else { loadDbArrivals(); loadDbCheck() }
    } catch (e) {
      alert(e.message)
    }
  }

  function exportArrivalErrors() {
    const link = document.createElement('a')
    link.href = '/api/arrival-analysis/export-errors'
    link.click()
  }

  function exportArrivalSummary() {
    const link = document.createElement('a')
    link.href = '/api/arrival-analysis/export-summary'
    link.click()
  }

  function exportArrivalCustomer(customerCode) {
    if (!customerCode) return
    const params = new URLSearchParams({ customerCode })
    const link = document.createElement('a')
    link.href = `/api/arrival-customer/export?${params.toString()}`
    link.click()
  }

  async function openArrivalFileDetail(sourceFile) {
    if (!sourceFile) return
    setSelectedArrivalFileDetail({ summary: { sourceFile }, items: [] })
    setArrivalFileDetailLoading(true)
    try {
      const params = new URLSearchParams({ sourceFile })
      params.set('_t', String(Date.now()))
      const response = await apiFetch(`/api/arrival-file-detail?${params.toString()}`)
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || '加载到货文件详情失败')
      setSelectedArrivalFileDetail(json)
    } catch (error) {
      setSelectedArrivalFileDetail({ summary: { sourceFile }, items: [], message: error.message })
    } finally {
      setArrivalFileDetailLoading(false)
    }
  }

  function closeArrivalFileDetail() {
    setSelectedArrivalFileDetail(null)
    setArrivalFileDetailLoading(false)
  }

  function exportArrivalAdvByFile(sourceFile) {
    if (!sourceFile) return
    const params = new URLSearchParams({ sourceFile })
    const link = document.createElement('a')
    link.href = `/api/arrival-file/export-adv?${params.toString()}`
    link.click()
  }

  async function openContractDetail(contract) {
    setSelectedContract(contract)
    setContractDetailItems([])
    setContractDetailLoading(true)

    try {
      const params = new URLSearchParams({
        contractNo: contract.contractNo || '',
        customerCode: contract.customerCode || '',
      })
      const response = await apiFetch(`/api/contract-items?${params.toString()}`)
      const json = await response.json()
      setContractDetailItems(json.items || [])
    } finally {
      setContractDetailLoading(false)
    }
  }

  function closeContractDetail() {
    setSelectedContract(null)
    setContractDetailItems([])
    setContractDetailLoading(false)
  }

  async function openCustomerAnalysis(customer) {
    setSelectedCustomer(customer)
    setCustomerAnalysis(null)
    setSelectedCustomerYear(null)
    setCustomerAnalysisLoading(true)

    try {
      const params = new URLSearchParams({
        customerCode: customer.customerCode || '',
      })
      const response = await apiFetch(`/api/customer-analysis?${params.toString()}`)
      const json = await response.json()
      setCustomerAnalysis(json)
      setSelectedCustomerYear(null)
    } finally {
      setCustomerAnalysisLoading(false)
    }
  }

  function closeCustomerAnalysis() {
    setSelectedCustomer(null)
    setCustomerAnalysis(null)
    setSelectedCustomerYear(null)
    setCustomerAnalysisLoading(false)
  }

  async function openPartAnalysis(part) {
    setSelectedPart(part)
    setPartAnalysis(null)
    setSelectedPartYear(null)
    setPartAnalysisLoading(true)

    try {
      const params = new URLSearchParams({
        partNo: part.partNo || '',
        interchangePartNo: part.interchangePartNo || '',
      })
      const response = await apiFetch(`/api/part-analysis?${params.toString()}`)
      const json = await response.json()
      setPartAnalysis(json)
      setSelectedPartYear(null)
    } finally {
      setPartAnalysisLoading(false)
    }
  }

  function closePartAnalysis() {
    setSelectedPart(null)
    setPartAnalysis(null)
    setSelectedPartYear(null)
    setPartAnalysisLoading(false)
  }

  function exportContracts() {
    if (!(contractMeta.total || 0)) return

    const params = new URLSearchParams()
    if (contractSearch) params.set('search', contractSearch)
    if (contractYearFilter) params.set('year', contractYearFilter)

    const link = document.createElement('a')
    link.href = `/api/contracts/export?${params.toString()}`
    link.click()
  }

  function renderPagination(meta, onPageChange) {
    const totalPages = Math.max(1, Math.ceil((meta.total || 0) / (meta.pageSize || 25)))

    return (
      <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <div>
          共 <span className="font-semibold text-slate-900">{formatNumber(meta.total)}</span> 条，
          当前第 <span className="font-semibold text-slate-900">{meta.page}</span> / {totalPages} 页
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, meta.page - 1))}
            disabled={meta.page <= 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            上一页
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, meta.page + 1))}
            disabled={meta.page >= totalPages}
            className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>
    )
  }

  function renderDashboard() {
    return (
      <>
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

        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">筛选条件</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                placeholder="客户代码"
                value={filters.customer}
                onChange={(e) => setFilters((prev) => ({ ...prev, customer: e.target.value }))}
              />
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                placeholder="合同号"
                value={filters.contract}
                onChange={(e) => setFilters((prev) => ({ ...prev, contract: e.target.value }))}
              />
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                placeholder="零件号 / 互换零件号"
                value={filters.part}
                onChange={(e) => setFilters((prev) => ({ ...prev, part: e.target.value }))}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">高频客户</h2>
            <div className="mt-4 space-y-3">
              {stats.topCustomers?.map((item) => (
                <div key={item.customerCode} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="font-medium">{item.customerCode}</span>
                  <span className="text-sm text-slate-500">{formatNumber(item.count)} 条</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold">订单明细</h2>
          </div>

          {dashboardLoading ? (
            <div className="px-5 py-10 text-sm text-slate-500">正在加载数据...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3">客户</th>
                    <th className="px-4 py-3">合同号</th>
                    <th className="px-4 py-3">序号</th>
                    <th className="px-4 py-3">零件号</th>
                    <th className="px-4 py-3">互换零件号</th>
                    <th className="px-4 py-3">零件名</th>
                    <th className="px-4 py-3">单价</th>
                    <th className="px-4 py-3">个数</th>
                    <th className="px-4 py-3">总价</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{order.customerCode || '-'}</td>
                      <td className="px-4 py-3">{order.contractNo || '-'}</td>
                      <td className="px-4 py-3">{order.sequence || '-'}</td>
                      <td className="px-4 py-3">{formatPartCode(order.partNo)}</td>
                      <td className="px-4 py-3">{formatPartCode(order.interchangePartNo)}</td>
                      <td className="px-4 py-3">{order.partName || '-'}</td>
                      <td className="px-4 py-3">{formatMoney(order.unitPrice)}</td>
                      <td className="px-4 py-3">{formatNumber(order.quantity)}</td>
                      <td className="px-4 py-3">{formatMoney(order.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!orders.length && <div className="px-5 py-8 text-sm text-slate-500">没有匹配到数据。</div>}
            </div>
          )}
        </div>
      </>
    )
  }

  function renderContracts() {
    return (
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">合同信息</h2>
              <p className="text-sm text-slate-500">按合同查看零件总个数、到货情况和合同总金额，并可按年份筛选。</p>
            </div>
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
              <button
                onClick={exportContracts}
                disabled={!contracts.length}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                导出筛选结果
              </button>
            </div>
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

  function renderContractDetailModal() {
    if (!selectedContract) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <div className="w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">合同详情</h3>
              <p className="mt-1 text-sm text-slate-500">
                合同号：{selectedContract.contractNo || '-'} ｜ 客户：{selectedContract.customerCode || '-'} ｜ 共 {formatNumber(contractDetailItems.length)} 条
              </p>
            </div>
            <button
              onClick={closeContractDetail}
              className="rounded-lg px-3 py-1.5 text-slate-500 hover:bg-slate-100"
            >
              关闭
            </button>
          </div>

          {contractDetailLoading ? (
            <div className="px-5 py-10 text-sm text-slate-500">正在加载合同条目...</div>
          ) : (
            <div className="max-h-[65vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3">序号</th>
                    <th className="px-4 py-3">零件号</th>
                    <th className="px-4 py-3">互换零件号</th>
                    <th className="px-4 py-3">零件名</th>
                    <th className="px-4 py-3">单价</th>
                    <th className="px-4 py-3">个数</th>
                    <th className="px-4 py-3">总价</th>
                    <th className="px-4 py-3">到货数量</th>
                    <th className="px-4 py-3">到货详情</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {contractDetailItems.map((item, index) => {
                    const isOverArrived = Number(item.arrivalQuantity || 0) > Number(item.quantity || 0)

                    return (
                      <tr key={`${item.id}-${index}`} className={isOverArrived ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'hover:bg-slate-50'}>
                        <td className="px-4 py-3">{item.sequence || index + 1}</td>
                        <td className="px-4 py-3">{formatPartCode(item.partNo)}</td>
                        <td className="px-4 py-3">{formatPartCode(item.interchangePartNo)}</td>
                        <td className="px-4 py-3">{item.partName || '-'}</td>
                        <td className="px-4 py-3">{formatMoney(item.unitPrice)}</td>
                        <td className="px-4 py-3">{formatNumber(item.quantity)}</td>
                        <td className="px-4 py-3">{formatMoney(item.totalPrice)}</td>
                        <td className="px-4 py-3 text-indigo-700">
                          <div className="flex items-center gap-2">
                            <span>{formatNumber(item.arrivalQuantity)}</span>
                            {isOverArrived && (
                              <span className="inline-block rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                                错误
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {item.arrivalDetails?.length ? (
                            <div className="space-y-1">
                              {item.arrivalDetails.map((detail, detailIdx) => (
                                <div key={`${item.id}-${detail.date}-${detailIdx}`} className="text-xs text-slate-700">
                                  {detail.date}：{formatNumber(detail.quantity)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!contractDetailItems.length && (
                <div className="px-5 py-8 text-sm text-slate-500">该合同暂无详细条目。</div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderArrivalHistoryModal() {
    if (!selectedArrivalHistory) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">到货历史</h3>
              <button
                onClick={() => setSelectedArrivalHistory(null)}
                className="text-slate-500 hover:bg-slate-100 rounded-lg px-2 py-1"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="px-5 py-4">
            {selectedArrivalHistory && selectedArrivalHistory.length > 0 ? (
              <div className="space-y-3">
                {selectedArrivalHistory.map((record, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-slate-900">{record.date}</span>
                      <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">{record.ratio}%</span>
                    </div>
                    <div className="text-sm text-slate-600">
                      到货数量: <span className="font-semibold text-slate-900">{formatNumber(record.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 py-6 text-center">暂无到货历史记录</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  function renderArrivalFileDetailModal() {
    if (!selectedArrivalFileDetail) return null

    const summary = selectedArrivalFileDetail.summary || {}
    const items = selectedArrivalFileDetail.items || []

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <div className="w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">到货文件详情</h3>
              <p className="mt-1 text-sm text-slate-500">
                来源文件：{summary.sourceFile || '-'} ｜ 到货行数：{formatNumber(summary.totalRows)} ｜ 客户数：{formatNumber(summary.customerCount)} ｜ 到货总金额：{formatMoney(summary.totalAmount)}
              </p>
            </div>
            <button
              onClick={closeArrivalFileDetail}
              className="rounded-lg px-3 py-1.5 text-slate-500 hover:bg-slate-100"
            >
              关闭
            </button>
          </div>

          {arrivalFileDetailLoading ? (
            <div className="px-5 py-10 text-sm text-slate-500">正在加载到货文件详情...</div>
          ) : (
            <div className="max-h-[65vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3">客户</th>
                    <th className="px-4 py-3">合同号</th>
                    <th className="px-4 py-3">序号</th>
                    <th className="px-4 py-3">零件号</th>
                    <th className="px-4 py-3">互换零件号</th>
                    <th className="px-4 py-3">零件名</th>
                    <th className="px-4 py-3">单价</th>
                    <th className="px-4 py-3">个数</th>
                    <th className="px-4 py-3">总价</th>
                    <th className="px-4 py-3">到货时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item, index) => (
                    <tr key={`${item.id || 'arrival'}-${index}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{item.customerCode || '-'}</td>
                      <td className="px-4 py-3">{item.contractNo || '-'}</td>
                      <td className="px-4 py-3">{formatNumber(item.sequence)}</td>
                      <td className="px-4 py-3">{formatPartCode(item.partNo)}</td>
                      <td className="px-4 py-3">{formatPartCode(item.interchangePartNo)}</td>
                      <td className="px-4 py-3">{item.partName || '-'}</td>
                      <td className="px-4 py-3">{formatMoney(item.unitPrice)}</td>
                      <td className="px-4 py-3">{formatNumber(item.quantity)}</td>
                      <td className="px-4 py-3">{formatMoney(item.totalPrice)}</td>
                      <td className="px-4 py-3">{item.arrivalDate || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!items.length && (
                <div className="px-5 py-8 text-sm text-slate-500">该到货文件暂无明细数据。</div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderCustomers() {
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

  function renderParts() {
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

  function renderArrival() {
    const summary = arrivalAnalysis?.summary || {}
    const arrivalYears = summary.arrivalYears || {}
    const arrival2025 = arrivalYears['2025'] || { files: 0, rows: 0 }
    const arrival2026 = arrivalYears['2026'] || { files: 0, rows: 0 }
    const errorFieldStats = arrivalAnalysis?.errorFieldStats || []
    const fileStats = arrivalAnalysis?.fileStats || []
    const customerStats = arrivalAnalysis?.customerStats || []
    const checks = arrivalAnalysis?.checks || []

    const displayChecks = checks.filter((item) => {
      if (arrivalTab === 'correct') return item.checkResult === '全部正确'
      if (arrivalTab === 'error') return item.checkResult === '有错误'
      return true
    })

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
            <button
              onClick={() => setArrivalMainTab('detail')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${arrivalMainTab === 'detail' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              详情
            </button>
            <button
              onClick={() => setArrivalMainTab('summary')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${arrivalMainTab === 'summary' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              按文件汇总
            </button>
            <button
              onClick={() => setArrivalMainTab('customerSummary')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${arrivalMainTab === 'customerSummary' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              按客户汇总
            </button>
          </div>
        </div>

        {!!arrivalAnalysis?.message && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {arrivalAnalysis.message}
          </div>
        )}

        {arrivalMainTab === 'detail' ? (
          <>
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-base font-semibold">错误字段统计</h3>
              </div>
              <div className="overflow-x-auto px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  {errorFieldStats.map((item) => (
                    <span key={item.field} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                      {item.field}：{formatNumber(item.count)}
                    </span>
                  ))}
                  {!errorFieldStats.length && <span className="text-sm text-slate-500">暂无错误字段统计。</span>}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <h3 className="text-base font-semibold">到货核对明细（最多显示5000条）</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setArrivalTab('all')}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${arrivalTab === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                      全部（{formatNumber(checks.length)}）
                    </button>
                    <button
                      onClick={() => setArrivalTab('correct')}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${arrivalTab === 'correct' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                      正确（{formatNumber((summary.correctRows || 0))}）
                    </button>
                    <button
                      onClick={() => setArrivalTab('error')}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${arrivalTab === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                      有问题（{formatNumber((summary.errorRows || 0))}）
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3">行号</th>
                      <th className="px-4 py-3">到货时间</th>
                      <th className="px-4 py-3">来源文件</th>
                      <th className="px-4 py-3">合同号</th>
                      <th className="px-4 py-3">客户</th>
                      <th className="px-4 py-3">零件号</th>
                      <th className="px-4 py-3">序号</th>
                      <th className="px-4 py-3">零件名</th>
                      <th className="px-4 py-3">个数</th>
                      <th className="px-4 py-3">单价</th>
                      <th className="px-4 py-3">总价</th>
                      <th className="px-4 py-3">检查结果</th>
                      <th className="px-4 py-3">错误字段</th>
                      <th className="px-4 py-3">历史匹配情况</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {displayChecks.map((item, index) => (
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
            </div>
          </>
        ) : arrivalMainTab === 'summary' ? (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold">按到货文件汇总统计</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3">来源文件</th>
                    <th className="px-4 py-3">到货日期</th>
                    <th className="px-4 py-3">到货客户数</th>
                    <th className="px-4 py-3">到货合同数</th>
                    <th className="px-4 py-3">到货行数</th>
                    <th className="px-4 py-3">有效检查行数</th>
                    <th className="px-4 py-3">错误行数</th>
                    <th className="px-4 py-3">到货总个数</th>
                    <th className="px-4 py-3">到货总金额</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
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
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openArrivalFileDetail(item.sourceFile)}
                            className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                          >
                            详情
                          </button>
                          <button
                            onClick={() => exportArrivalAdvByFile(item.sourceFile)}
                            className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                          >
                            导出ADV
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!fileStats.length && <div className="px-5 py-8 text-sm text-slate-500">暂无到货文件汇总数据。</div>}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold">按客户汇总统计</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3">客户编号</th>
                    <th className="px-4 py-3">到货文件数</th>
                    <th className="px-4 py-3">到货日期</th>
                    <th className="px-4 py-3">到货合同数</th>
                    <th className="px-4 py-3">到货涵盖合同</th>
                    <th className="px-4 py-3">到货行数</th>
                    <th className="px-4 py-3">到货总个数</th>
                    <th className="px-4 py-3">到货总金额</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
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
                      <td className="px-4 py-3">
                        <button
                          onClick={() => exportArrivalCustomer(item.customerCode)}
                          className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          导出Excel
                        </button>
                      </td>
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

  function renderUpload() {
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
        {/* 上传合同表 */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h3 className="text-base font-semibold text-slate-800 mb-1">上传合同表</h3>
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

        {/* 上传到货表 */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h3 className="text-base font-semibold text-slate-800 mb-1">上传到货表</h3>
          <p className="text-sm text-slate-500 mb-4">可一次选择多个文件，已存在的文件名会自动跳过，格式须与「Isuzu-XXXXXX- 国内-到货明细.xlsx」一致</p>
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
                  <button onClick={() => setUploadArrivalFiles((prev) => prev.filter((x) => x.name !== f.name))} className="ml-2 shrink-0 text-slate-400 hover:text-red-500">✕</button>
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
                    <li key={name}>✓ {name}</li>
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

  function renderDbCheck() {
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

        {!!dbCheck?.message && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{dbCheck.message}</div>
        )}

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
                            <input
                              type="text"
                              placeholder={`第 ${index + 1} 级搜索：对当前结果继续全文筛选...`}
                              value={value}
                              onChange={(e) => updateDbCondition('order', index, e.target.value)}
                              className="w-full max-w-xl flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            {index === dbOrderSearchLevels.length - 1 && (
                              <button
                                onClick={() => addDbCondition('order')}
                                disabled={!dbOrderPrimarySearched || dbOrderSearchLevels.length >= 3}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                + 添加条件
                              </button>
                            )}
                            {index > 0 && (
                              <button onClick={() => removeDbCondition('order', index)} className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100">删除条件</button>
                            )}
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
                            <select
                              value={condition.field}
                              onChange={(e) => updateDbCondition('order', index, e.target.value, 'field')}
                              className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                              {dbOrderFilterFields.map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}
                            </select>
                            <select
                              multiple
                              value={condition.value || []}
                              onChange={(e) => updateDbCondition('order', index, Array.from(e.target.selectedOptions).map((opt) => opt.value), 'value')}
                              className="h-28 w-full max-w-xl flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                              {(dbOrderFilterOptions[condition.field] || []).map((value) => (
                                <option key={`${condition.field}-${value}`} value={value}>{value}</option>
                              ))}
                            </select>
                            {index === dbOrderConditions.length - 1 && (
                              <button
                                onClick={() => addDbCondition('order')}
                                disabled={dbOrderConditions.length >= 3}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                + 添加条件
                              </button>
                            )}
                            {index > 0 && (
                              <button onClick={() => removeDbCondition('order', index)} className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100">删除条件</button>
                            )}
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
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-3">ID</th>
                      <th className="px-3 py-3">客户</th>
                      <th className="px-3 py-3">合同号</th>
                      <th className="px-3 py-3">序号</th>
                      <th className="px-3 py-3">零件号</th>
                      <th className="px-3 py-3">互换零件号</th>
                      <th className="px-3 py-3">零件名</th>
                      <th className="px-3 py-3">个数</th>
                      <th className="px-3 py-3">单价</th>
                      <th className="px-3 py-3">总价</th>
                      <th className="px-3 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {dbOrderRows.map((item) => (
                      <tr key={`dbo-${item.id}`} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 text-slate-400">{item.id}</td>
                        <td className="px-3 py-2.5">{item.customerCode || '-'}</td>
                        <td className="px-3 py-2.5">{item.contractNo || '-'}</td>
                        <td className="px-3 py-2.5">{item.sequence || '-'}</td>
                        <td className="px-3 py-2.5">{formatPartCode(item.partNo)}</td>
                        <td className="px-3 py-2.5">{formatPartCode(item.interchangePartNo)}</td>
                        <td className="px-3 py-2.5">{item.partName || '-'}</td>
                        <td className="px-3 py-2.5">{formatNumber(item.quantity)}</td>
                        <td className="px-3 py-2.5">{formatMoney(item.unitPrice)}</td>
                        <td className="px-3 py-2.5">{formatMoney(item.totalPrice)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1">
                            <button onClick={() => openDbEditModal('order', 'edit', item)} className="rounded px-2 py-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100">编辑</button>
                            <button onClick={() => deleteDbRecord('order', item.id)} className="rounded px-2 py-1 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100">删除</button>
                          </div>
                        </td>
                      </tr>
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
                  <button disabled={dbOrderPage <= 1} onClick={() => setDbOrderPage(p => p - 1)} className="rounded-lg bg-slate-100 px-3 py-1 disabled:opacity-40 hover:bg-slate-200">上一页</button>
                  <button disabled={dbOrderPage >= totalOrderPages} onClick={() => setDbOrderPage(p => p + 1)} className="rounded-lg bg-slate-100 px-3 py-1 disabled:opacity-40 hover:bg-slate-200">下一页</button>
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
                            <input
                              type="text"
                              placeholder={`第 ${index + 1} 级搜索：对当前结果继续全文筛选...`}
                              value={value}
                              onChange={(e) => updateDbCondition('arrival', index, e.target.value)}
                              className="w-full max-w-xl flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            {index === dbArrivalSearchLevels.length - 1 && (
                              <button
                                onClick={() => addDbCondition('arrival')}
                                disabled={!dbArrivalPrimarySearched || dbArrivalSearchLevels.length >= 3}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                + 添加条件
                              </button>
                            )}
                            {index > 0 && (
                              <button onClick={() => removeDbCondition('arrival', index)} className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100">删除条件</button>
                            )}
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
                            <select
                              value={condition.field}
                              onChange={(e) => updateDbCondition('arrival', index, e.target.value, 'field')}
                              className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                              {dbArrivalFilterFields.map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}
                            </select>
                            <select
                              multiple
                              value={condition.value || []}
                              onChange={(e) => updateDbCondition('arrival', index, Array.from(e.target.selectedOptions).map((opt) => opt.value), 'value')}
                              className="h-28 w-full max-w-xl flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                              {(dbArrivalFilterOptions[condition.field] || []).map((value) => (
                                <option key={`${condition.field}-${value}`} value={value}>{value}</option>
                              ))}
                            </select>
                            {index === dbArrivalConditions.length - 1 && (
                              <button
                                onClick={() => addDbCondition('arrival')}
                                disabled={dbArrivalConditions.length >= 3}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                + 添加条件
                              </button>
                            )}
                            {index > 0 && (
                              <button onClick={() => removeDbCondition('arrival', index)} className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100">删除条件</button>
                            )}
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
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-3">ID</th>
                      <th className="px-3 py-3">到货日期</th>
                      <th className="px-3 py-3">客户</th>
                      <th className="px-3 py-3">合同号</th>
                      <th className="px-3 py-3">序号</th>
                      <th className="px-3 py-3">零件号</th>
                      <th className="px-3 py-3">零件名</th>
                      <th className="px-3 py-3">个数</th>
                      <th className="px-3 py-3">单价</th>
                      <th className="px-3 py-3">来源文件</th>
                      <th className="px-3 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {dbArrivalRows.map((item) => (
                      <tr key={`dba-${item.id}`} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 text-slate-400">{item.id}</td>
                        <td className="px-3 py-2.5">{item.arrivalDate || '-'}</td>
                        <td className="px-3 py-2.5">{item.customerCode || '-'}</td>
                        <td className="px-3 py-2.5">{item.contractNo || '-'}</td>
                        <td className="px-3 py-2.5">{item.sequence || '-'}</td>
                        <td className="px-3 py-2.5">{formatPartCode(item.partNo)}</td>
                        <td className="px-3 py-2.5">{item.partName || '-'}</td>
                        <td className="px-3 py-2.5">{formatNumber(item.quantity)}</td>
                        <td className="px-3 py-2.5">{formatMoney(item.unitPrice)}</td>
                        <td className="px-3 py-2.5 max-w-[160px] truncate text-slate-500" title={item.sourceFile}>{item.sourceFile || '-'}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1">
                            <button onClick={() => openDbEditModal('arrival', 'edit', item)} className="rounded px-2 py-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100">编辑</button>
                            <button onClick={() => deleteDbRecord('arrival', item.id)} className="rounded px-2 py-1 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100">删除</button>
                          </div>
                        </td>
                      </tr>
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
                  <button disabled={dbArrivalPage <= 1} onClick={() => setDbArrivalPage(p => p - 1)} className="rounded-lg bg-slate-100 px-3 py-1 disabled:opacity-40 hover:bg-slate-200">上一页</button>
                  <button disabled={dbArrivalPage >= totalArrivalPages} onClick={() => setDbArrivalPage(p => p + 1)} className="rounded-lg bg-slate-100 px-3 py-1 disabled:opacity-40 hover:bg-slate-200">下一页</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  function renderDbEditModal() {
    if (!dbEditModal) return null
    const { type, mode } = dbEditModal
    const isOrder = type === 'order'
    const title = `${mode === 'add' ? '新增' : '编辑'}${isOrder ? '订单' : '到货'}记录`
    const F = ({ label, fieldKey, inputType = 'text' }) => (
      <div>
        <label className="mb-1 block text-xs text-slate-500">{label}</label>
        <input
          type={inputType}
          value={dbEditForm[fieldKey] ?? ''}
          onChange={(e) => setDbEditForm(f => ({ ...f, [fieldKey]: e.target.value }))}
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
    )
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={() => setDbEditModal(null)} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">✕</button>
          </div>
          <div className="max-h-[65vh] overflow-y-auto p-5">
            <div className="grid grid-cols-2 gap-4">
              {isOrder ? (
                <>
                  <F label="合同号" fieldKey="contractNo" />
                  <F label="客户代码" fieldKey="customerCode" />
                  <F label="序号" fieldKey="sequence" />
                  <F label="零件号" fieldKey="partNo" />
                  <F label="互换零件号" fieldKey="interchangePartNo" />
                  <F label="零件名" fieldKey="partName" />
                  <F label="零件名（中文）" fieldKey="partNameCn" />
                  <F label="个数" fieldKey="quantity" inputType="number" />
                  <F label="单价" fieldKey="unitPrice" inputType="number" />
                  <F label="总价" fieldKey="totalPrice" inputType="number" />
                </>
              ) : (
                <>
                  <F label="来源文件" fieldKey="sourceFile" />
                  <F label="到货日期（如 260413）" fieldKey="arrivalDate" />
                  <F label="合同号" fieldKey="contractNo" />
                  <F label="客户代码" fieldKey="customerCode" />
                  <F label="序号" fieldKey="sequence" />
                  <F label="零件号" fieldKey="partNo" />
                  <F label="互换零件号" fieldKey="interchangePartNo" />
                  <F label="零件名" fieldKey="partName" />
                  <F label="个数" fieldKey="quantity" inputType="number" />
                  <F label="单价" fieldKey="unitPrice" inputType="number" />
                  <F label="总价" fieldKey="totalPrice" inputType="number" />
                </>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
            <button onClick={() => setDbEditModal(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm hover:bg-slate-200">取消</button>
            <button onClick={saveDbRecord} disabled={dbEditSaving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
              {dbEditSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderCustomerAnalysisModal() {
    if (!selectedCustomer) return null

    const summary = customerAnalysis?.summary
    const yearlyStats = customerAnalysis?.yearlyStats || []
    const topParts = customerAnalysis?.topParts || []
    const halfyear = customerAnalysis?.halfyearStats || {}
    const quarter = customerAnalysis?.quarterStats || {}
    const activeYear = yearlyStats.find((item) => item.year === selectedCustomerYear) || null
    const displayHalfyear = activeYear?.halfyearStats || halfyear
    const displayQuarter = activeYear?.quarterStats || quarter
    const displayTopParts = activeYear?.topParts || topParts
    const analysisTitle = activeYear ? `${activeYear.year} 年分析` : '历史全部分析'

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <div className="w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">客户分析</h3>
              <p className="mt-1 text-sm text-slate-500">客户：{selectedCustomer.customerCode || '-'}</p>
            </div>
            <button onClick={closeCustomerAnalysis} className="rounded-lg px-3 py-1.5 text-slate-500 hover:bg-slate-100">关闭</button>
          </div>

          {customerAnalysisLoading ? (
            <div className="px-5 py-10 text-sm text-slate-500">正在加载客户分析...</div>
          ) : (
            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">合同数</div><div className="mt-1 text-xl font-semibold">{formatNumber(summary?.contractCount)}</div></div>
                <div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">零件品类数</div><div className="mt-1 text-xl font-semibold">{formatNumber(summary?.partTypeCount)}</div></div>
                <div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">累计金额</div><div className="mt-1 text-xl font-semibold">{formatMoney(summary?.totalAmount)}</div></div>
                <div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">涉及零件号</div><div className="mt-1 text-sm font-semibold">{formatNumber(summary?.partList?.length || 0)} 个</div></div>
              </div>

              <div className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h4 className="font-semibold">年份变化概览</h4>
                  <p className="text-sm text-slate-500">点击年份后，可查看该年的上半年和下半年分析结果。</p>
                </div>
                <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                  {yearlyStats.map((item, index) => {
                    const previous = yearlyStats[index + 1]
                    const isActive = activeYear?.year === item.year

                    return (
                      <button
                        key={item.year}
                        onClick={() => setSelectedCustomerYear((prev) => (prev === item.year ? null : item.year))}
                        className={`rounded-xl border p-4 text-left transition ${
                          isActive
                            ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200'
                            : 'border-slate-200 bg-slate-50 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-semibold text-slate-900">{item.year}年</div>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-500'}`}>
                            {isActive ? '当前' : '点击查看'}
                          </span>
                        </div>
                        <div className="mt-3 space-y-1 text-sm text-slate-700">
                          <div>合同数：{formatNumber(item.contractCount)}</div>
                          <div>零件品类数：{formatNumber(item.partTypeCount)}</div>
                          <div>累计金额：{formatMoney(item.totalAmount)}</div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">金额同比：{formatYoYChange(item.totalAmount, previous?.totalAmount)}</div>
                      </button>
                    )
                  })}
                </div>
                {!yearlyStats.length && <div className="px-4 py-6 text-sm text-slate-500">暂无按年份分析结果。</div>}
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <h4 className="font-semibold">{analysisTitle}</h4>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h5 className="mb-3 font-semibold">半年度分析</h5>
                    <div className="grid gap-4 md:grid-cols-2">
                      {[
                        { key: 'H1', label: '上半年' },
                        { key: 'H2', label: '下半年' },
                      ].map((period) => (
                        <div key={period.key} className="rounded-xl bg-slate-50 p-4 text-sm">
                          <div className="font-medium text-slate-800">{period.label}</div>
                          <div className="mt-2 flex justify-between"><span>下单次数</span><span>{formatNumber(displayHalfyear?.[period.key]?.orderCount)}</span></div>
                          <div className="mt-2 flex justify-between"><span>总个数</span><span>{formatNumber(displayHalfyear?.[period.key]?.totalQuantity)}</span></div>
                          <div className="mt-2 flex justify-between"><span>总金额</span><span>{formatMoney(displayHalfyear?.[period.key]?.totalAmount)}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h5 className="mb-3 font-semibold">季度分析</h5>
                    <div className="grid gap-2 text-sm md:grid-cols-2">
                      {['Q1', 'Q2', 'Q3', 'Q4'].map((key) => (
                        <div key={key} className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="font-medium text-slate-700">{key}</div>
                          <div>次数：{formatNumber(displayQuarter?.[key]?.orderCount)}</div>
                          <div>个数：{formatNumber(displayQuarter?.[key]?.totalQuantity)}</div>
                          <div>金额：{formatMoney(displayQuarter?.[key]?.totalAmount)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 px-4 py-3 font-semibold">零件明细分析</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-4 py-3">零件号</th>
                        <th className="px-4 py-3">零件名</th>
                        <th className="px-4 py-3">条目数</th>
                        <th className="px-4 py-3">合同数</th>
                        <th className="px-4 py-3">总个数</th>
                        <th className="px-4 py-3">最低单价</th>
                        <th className="px-4 py-3">最高单价</th>
                        <th className="px-4 py-3">总金额</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {displayTopParts.map((item, index) => (
                        <tr key={`${item.partNo || 'na'}-${index}`}>
                          <td className="px-4 py-3 font-medium">{formatPartCode(item.partNo)}</td>
                          <td className="px-4 py-3">{item.partName || '-'}</td>
                          <td className="px-4 py-3">{formatNumber(item.entryCount)}</td>
                          <td className="px-4 py-3">{formatNumber(item.contractCount)}</td>
                          <td className="px-4 py-3">{formatNumber(item.totalQuantity)}</td>
                          <td className="px-4 py-3">{formatMoney(item.minUnitPrice)}</td>
                          <td className="px-4 py-3">{formatMoney(item.maxUnitPrice)}</td>
                          <td className="px-4 py-3">{formatMoney(item.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!displayTopParts.length && <div className="px-4 py-6 text-sm text-slate-500">暂无客户分析数据。</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderPartAnalysisModal() {
    if (!selectedPart) return null

    const summary = partAnalysis?.summary
    const yearlyStats = partAnalysis?.yearlyStats || []
    const customerBreakdown = partAnalysis?.customerBreakdown || []
    const halfyear = partAnalysis?.halfyearStats || {}
    const quarter = partAnalysis?.quarterStats || {}
    const activeYear = yearlyStats.find((item) => item.year === selectedPartYear) || null
    const displayHalfyear = activeYear?.halfyearStats || halfyear
    const displayQuarter = activeYear?.quarterStats || quarter
    const displayCustomerBreakdown = activeYear?.customerBreakdown || customerBreakdown
    const displayMinUnitPrice = activeYear?.minUnitPrice ?? summary?.minUnitPrice
    const displayMaxUnitPrice = activeYear?.maxUnitPrice ?? summary?.maxUnitPrice
    const displayPriceRatio = activeYear?.priceRatio ?? ((summary?.minUnitPrice && summary?.maxUnitPrice) ? Number(summary.maxUnitPrice / summary.minUnitPrice).toFixed(4) : null)
    const analysisTitle = activeYear ? `${activeYear.year} 年分析` : '历史全部分析'

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <div className="w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">零件分析</h3>
              <p className="mt-1 text-sm text-slate-500">零件号：{formatPartCode(summary?.partNo || selectedPart.partNo)} ｜ 零件名：{summary?.partName || selectedPart.partName || '-'}</p>
            </div>
            <button onClick={closePartAnalysis} className="rounded-lg px-3 py-1.5 text-slate-500 hover:bg-slate-100">关闭</button>
          </div>

          {partAnalysisLoading ? (
            <div className="px-5 py-10 text-sm text-slate-500">正在加载零件分析...</div>
          ) : (
            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
              <div className="grid gap-4 md:grid-cols-5">
                <div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">涉及客户数</div><div className="mt-1 text-xl font-semibold">{formatNumber(summary?.customerCount)}</div></div>
                <div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">历史总个数</div><div className="mt-1 text-xl font-semibold">{formatNumber(summary?.totalQuantity)}</div></div>
                <div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">累计金额</div><div className="mt-1 text-xl font-semibold">{formatMoney(summary?.totalAmount)}</div></div>
                <div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">最低销售价</div><div className="mt-1 text-xl font-semibold">{formatMoney(summary?.minUnitPrice)}</div></div>
                <div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">最高销售价</div><div className="mt-1 text-xl font-semibold">{formatMoney(summary?.maxUnitPrice)}</div></div>
              </div>

              <div className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h4 className="font-semibold">年份变化概览</h4>
                  <p className="text-sm text-slate-500">点击年份后，可查看该年的上半年和下半年分析结果。</p>
                </div>
                <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                  {yearlyStats.map((item, index) => {
                    const previous = yearlyStats[index + 1]
                    const isActive = activeYear?.year === item.year

                    return (
                      <button
                        key={item.year}
                        onClick={() => setSelectedPartYear((prev) => (prev === item.year ? null : item.year))}
                        className={`rounded-xl border p-4 text-left transition ${
                          isActive
                            ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200'
                            : 'border-slate-200 bg-slate-50 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-semibold text-slate-900">{item.year}年</div>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-500'}`}>
                            {isActive ? '当前' : '点击查看'}
                          </span>
                        </div>
                        <div className="mt-3 space-y-1 text-sm text-slate-700">
                          <div>涉及客户数：{formatNumber(item.customerCount)}</div>
                          <div>历史总个数：{formatNumber(item.totalQuantity)}</div>
                          <div>累计金额：{formatMoney(item.totalAmount)}</div>
                          <div>最低/最高价：{formatMoney(item.minUnitPrice)} / {formatMoney(item.maxUnitPrice)}</div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">金额同比：{formatYoYChange(item.totalAmount, previous?.totalAmount)} ｜ 价格比（最高/最低）：{item.priceRatio ? `${item.priceRatio}x` : '—'}</div>
                      </button>
                    )
                  })}
                </div>
                {!yearlyStats.length && <div className="px-4 py-6 text-sm text-slate-500">暂无按年份分析结果。</div>}
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <h4 className="font-semibold">{analysisTitle}</h4>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4 text-sm">
                    <div className="text-slate-500">最低销售价</div>
                    <div className="mt-1 text-xl font-semibold">{formatMoney(displayMinUnitPrice)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-sm">
                    <div className="text-slate-500">最高销售价</div>
                    <div className="mt-1 text-xl font-semibold">{formatMoney(displayMaxUnitPrice)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-sm">
                    <div className="text-slate-500">价格比（最高/最低）</div>
                    <div className="mt-1 text-xl font-semibold">{displayPriceRatio ? `${displayPriceRatio}x` : '—'}</div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h5 className="mb-3 font-semibold">半年度分析</h5>
                    <div className="grid gap-4 md:grid-cols-2">
                      {[
                        { key: 'H1', label: '上半年' },
                        { key: 'H2', label: '下半年' },
                      ].map((period) => (
                        <div key={period.key} className="rounded-xl bg-slate-50 p-4 text-sm">
                          <div className="font-medium text-slate-800">{period.label}</div>
                          <div className="mt-2 flex justify-between"><span>下单次数</span><span>{formatNumber(displayHalfyear?.[period.key]?.orderCount)}</span></div>
                          <div className="mt-2 flex justify-between"><span>总个数</span><span>{formatNumber(displayHalfyear?.[period.key]?.totalQuantity)}</span></div>
                          <div className="mt-2 flex justify-between"><span>总金额</span><span>{formatMoney(displayHalfyear?.[period.key]?.totalAmount)}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h5 className="mb-3 font-semibold">季度分析</h5>
                    <div className="grid gap-2 text-sm md:grid-cols-2">
                      {['Q1', 'Q2', 'Q3', 'Q4'].map((key) => (
                        <div key={key} className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="font-medium text-slate-700">{key}</div>
                          <div>次数：{formatNumber(displayQuarter?.[key]?.orderCount)}</div>
                          <div>个数：{formatNumber(displayQuarter?.[key]?.totalQuantity)}</div>
                          <div>金额：{formatMoney(displayQuarter?.[key]?.totalAmount)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 px-4 py-3 font-semibold">客户维度分析</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-4 py-3">客户</th>
                        <th className="px-4 py-3">合同数</th>
                        <th className="px-4 py-3">条目数</th>
                        <th className="px-4 py-3">总个数</th>
                        <th className="px-4 py-3">最低单价</th>
                        <th className="px-4 py-3">最高单价</th>
                        <th className="px-4 py-3">总金额</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {displayCustomerBreakdown.map((item) => (
                        <tr key={item.customerCode}>
                          <td className="px-4 py-3 font-medium">{item.customerCode || '-'}</td>
                          <td className="px-4 py-3">{formatNumber(item.contractCount)}</td>
                          <td className="px-4 py-3">{formatNumber(item.entryCount)}</td>
                          <td className="px-4 py-3">{formatNumber(item.totalQuantity)}</td>
                          <td className="px-4 py-3">{formatMoney(item.minUnitPrice)}</td>
                          <td className="px-4 py-3">{formatMoney(item.maxUnitPrice)}</td>
                          <td className="px-4 py-3">{formatMoney(item.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!displayCustomerBreakdown.length && <div className="px-4 py-6 text-sm text-slate-500">暂无零件分析数据。</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const viewMeta = navItems.find((item) => item.key === activeView)

  if (!authToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">顺昊 ERP</h1>
            <p className="text-slate-400 text-sm mt-1">请输入访问码登录</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">访问码</label>
              <input
                type="password"
                value={loginCode}
                onChange={(e) => { setLoginCode(e.target.value); setLoginError('') }}
                placeholder="请输入 32 位访问码"
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm tracking-widest"
              />
            </div>
            {loginError && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={loginLoading || !loginCode.trim()}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
            >
              {loginLoading ? '验证中...' : '登录'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col border-r border-slate-200 bg-slate-900 text-slate-100 lg:flex">
          <div className="border-b border-slate-800 px-6 py-6">
            <p className="text-sm font-medium text-indigo-300">React + Tailwind + Flask</p>
            <h1 className="mt-2 text-2xl font-bold">订单可视化</h1>
            <p className="mt-2 text-sm text-slate-400">查看历史订单、合同汇总和客户汇总。</p>
          </div>
          <nav className="flex-1 space-y-2 px-4 py-4">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                  activeView === item.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold">{item.label}</div>
                <div className="text-xs text-slate-300/90">{item.desc}</div>
              </button>
            ))}
          </nav>
          <div className="border-t border-slate-800 px-4 py-4">
            <button
              onClick={handleLogout}
              className="w-full rounded-2xl px-4 py-3 text-left text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
            >
              <div className="font-semibold text-sm">退出登录</div>
            </button>
          </div>
        </aside>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-600">{viewMeta?.label}</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight">{viewMeta?.desc}</h2>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncing ? '同步中...' : '重新同步 Excel'}
            </button>
          </div>

          <div className="mb-4 flex gap-2 lg:hidden">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                className={`rounded-xl px-3 py-2 text-sm font-medium ${
                  activeView === item.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {activeView === 'dashboard' && renderDashboard()}
          {activeView === 'contracts' && renderContracts()}
          {activeView === 'customers' && renderCustomers()}
          {activeView === 'parts' && renderParts()}
          {activeView === 'arrival' && renderArrival()}
          {activeView === 'upload' && renderUpload()}
          {activeView === 'dbcheck' && renderDbCheck()}
        </main>
      </div>
      {renderContractDetailModal()}
      {renderArrivalHistoryModal()}
      {renderArrivalFileDetailModal()}
      {renderCustomerAnalysisModal()}
      {renderPartAnalysisModal()}
      {renderDbEditModal()}
    </div>
  )
}
