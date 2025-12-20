import { useState, useEffect } from 'react'
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  DatePicker, 
  Statistic,
  Select,
  Button
} from 'antd'
import { 
  InboxOutlined, 
  CheckCircleOutlined, 
  ToolOutlined,
  DownloadOutlined,
  SwapOutlined,
  DollarOutlined,
  FilterOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts'
import dayjs from 'dayjs'
import { api } from '../../lib/api'
import { getOrganizationCategory } from '../../lib/auth'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

// Green shades based on tail green (#0891b2)
const COLORS = [
  '#0891b2', // Base tail green
  '#06b6d4', // Lighter shade
  '#22d3ee', // Light shade
  '#67e8f9', // Very light shade
  '#0e7490', // Darker shade
  '#155e75', // Dark shade
  '#164e63', // Very dark shade
  '#a5f3fc'  // Lightest shade
]

export default function Analytics() {
  const orgCategory = getOrganizationCategory()
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(6, 'month'),
    dayjs()
  ])
  
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined)
  const [selectedCondition, setSelectedCondition] = useState<string | undefined>(undefined)
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined)
  const [categories, setCategories] = useState<any[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Chart type states
  const [statusChartType, setStatusChartType] = useState<'bar' | 'line' | 'area' | 'pie'>('bar')
  const [conditionChartType, setConditionChartType] = useState<'pie' | 'bar' | 'line' | 'area'>('area')
  const [procurementChartType, setProcurementChartType] = useState<'bar' | 'line' | 'area' | 'pie'>('pie')
  const [categoryChartType, setCategoryChartType] = useState<'bar' | 'line' | 'area' | 'pie'>('line')
  const [materialStatusChartType, setMaterialStatusChartType] = useState<'bar' | 'line' | 'area' | 'pie'>('bar')

  const [availabilityData, setAvailabilityData] = useState<any[]>([])
  const [procurementData, setProcurementData] = useState<any[]>([])
  const [conditionData, setConditionData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [statusData, setStatusData] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalInventory: 0,
    availableItems: 0,
    reservedItems: 0,
    surplusItems: 0,
    procurementRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    costAvoided: 0
  })

  // Fetch categories for filter dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/analytics/categories')
        setCategories(response.data.data)
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }
    fetchCategories()
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (dateRange[0]) {
        params.append('fromDate', dateRange[0].format('YYYY-MM-DD'))
      }
      if (dateRange[1]) {
        params.append('toDate', dateRange[1].format('YYYY-MM-DD'))
      }
      if (selectedCategory) {
        params.append('categoryId', selectedCategory)
      }
      if (selectedCondition) {
        params.append('condition', selectedCondition)
      }
      if (selectedStatus) {
        params.append('status', selectedStatus)
      }

      // Fetch dashboard data
      const dashboardResponse = await api.get(`/analytics/dashboard?${params.toString()}`)
      const dashboardData = dashboardResponse.data.data

      // Fetch categories data
      const categoriesResponse = await api.get('/analytics/categories')
      const categories = categoriesResponse.data.data

      // Fetch statuses data
      const statusesResponse = await api.get('/analytics/statuses')
      const statuses = statusesResponse.data.data

      // Fetch availability data
      const availabilityResponse = await api.get(`/analytics/availability?${params.toString()}`)
      const availability = availabilityResponse.data.data

      // Fetch transfers data
      const transfersResponse = await api.get(`/analytics/transfers?${params.toString()}`)
      const transfers = transfersResponse.data.data

      // Fetch conditions data
      const conditionsResponse = await api.get(`/analytics/conditions?${params.toString()}`)
      const conditions = conditionsResponse.data.data

      // Set stats from dashboard data
      const totalProcurementRequests = dashboardData.transfers?.reduce((acc: number, t: any) => acc + t.count, 0) || 0
      const pendingRequests = dashboardData.transfers?.find((t: any) => t._id === 'PENDING')?.count || 0
      const approvedRequests = dashboardData.transfers?.find((t: any) => t._id === 'APPROVED')?.count || 0
      
      setStats({
        totalInventory: dashboardData.overall?.totalMaterials || 0,
        availableItems: dashboardData.overall?.availableMaterials || 0,
        reservedItems: availability.summary?.reservedMaterials || 0,
        surplusItems: dashboardData.overall?.surplusMaterials || 0,
        procurementRequests: totalProcurementRequests,
        pendingRequests: pendingRequests,
        approvedRequests: approvedRequests,
        costAvoided: dashboardData.overall?.totalEstimatedValue || 0
      })

      // Set availability data
      const availabilityChartData = availability.summary ? [
        { '_id': { 'status': 'AVAILABLE' }, 'totalQuantity': availability.summary.availableMaterials, 'count': availability.summary.availableMaterials },
        { '_id': { 'status': 'RESERVED' }, 'totalQuantity': availability.summary.reservedMaterials, 'count': availability.summary.reservedMaterials },
        { '_id': { 'status': 'SURPLUS' }, 'totalQuantity': availability.summary.surplusMaterials, 'count': availability.summary.surplusMaterials }
      ] : []
      setAvailabilityData(availabilityChartData)

      // Set procurement data (transfers by month)
      const procurementChartData = transfers.details?.map((t: any) => ({
        '_id': { 'month': t._id.month },
        'approved': t._id.status === 'APPROVED' ? t.count : 0,
        'pending': t._id.status === 'PENDING' ? t.count : 0,
        'rejected': t._id.status === 'REJECTED' ? t.count : 0,
        'completed': t._id.status === 'COMPLETED' ? t.count : 0
      })) || []
      
      // Group by month
      const groupedProcurement = procurementChartData.reduce((acc: any, curr: any) => {
        const month = curr._id.month
        if (!acc[month]) {
          acc[month] = { '_id': { 'month': month }, 'approved': 0, 'pending': 0, 'rejected': 0, 'completed': 0 }
        }
        acc[month].approved += curr.approved
        acc[month].pending += curr.pending
        acc[month].rejected += curr.rejected
        acc[month].completed += curr.completed
        return acc
      }, {})
      setProcurementData(Object.values(groupedProcurement))

      // Set condition data
      setConditionData(conditions || [])

      // Set category data
      const categoryChartData = categories.map((cat: any) => ({
        '_id': { 'category': cat.name },
        'totalQuantity': cat.totalQuantity || 0,
        'count': cat.materialsCount || 0,
        'totalValue': cat.totalEstimatedValue || 0
      }))
      setCategoryData(categoryChartData)

      // Set status data
      const statusChartData = statuses.map((status: any) => ({
        '_id': { 'status': status.name },
        'count': status.materialsCount || 0,
        'totalQuantity': status.totalQuantity || 0
      }))
      setStatusData(statusChartData)

    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange, selectedCategory, selectedCondition, selectedStatus])

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setDateRange(dates)
    }
  }

  const clearAllFilters = () => {
    setSelectedCategory(undefined)
    setSelectedCondition(undefined)
    setSelectedStatus(undefined)
    setDateRange([dayjs().subtract(6, 'month'), dayjs()])
  }

  const handleExportReport = async () => {
    setExportLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (dateRange[0]) {
        params.append('fromDate', dateRange[0].format('YYYY-MM-DD'))
      }
      if (dateRange[1]) {
        params.append('toDate', dateRange[1].format('YYYY-MM-DD'))
      }
      if (selectedCategory) {
        params.append('categoryId', selectedCategory)
      }
      if (selectedCondition) {
        params.append('condition', selectedCondition)
      }
      if (selectedStatus) {
        params.append('status', selectedStatus)
      }
      
      const response = await api.get(`/analytics/export?${params.toString()}`, {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `analytics-report-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('Failed to export report:', error)
    } finally {
      setExportLoading(false)
    }
  }


  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Analytics Dashboard
            </Title>
            {orgCategory && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Category:{' '}
                <span style={{ color: '#0891b2', fontWeight: 600 }}>
                  {orgCategory.replace(/_/g, ' ')}
                </span>
              </Text>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button 
              icon={<ReloadOutlined />}
              onClick={fetchAnalytics}
              loading={loading}
            >
              Refresh
            </Button>
            <Button 
              onClick={handleExportReport}
              icon={<DownloadOutlined />}
              loading={exportLoading}
            >
              Export Report
            </Button>
          </div>
        </div>
        
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={[8, 8]} align="middle">
            <Col xs={24} sm={12} md={6} className="hide-on-mobile">
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Date Range</div>
                <RangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  style={{ width: '100%', height: 36 }}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={5} className="hide-on-mobile">
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Item Category</div>
                <Select
                  placeholder="All Categories"
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  allowClear
                  style={{ width: '100%', height: 36 }}
                >
                  {categories.map((cat) => (
                    <Option key={cat._id} value={cat._id}>{cat.name}</Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col xs={24} sm={12} md={5} className="hide-on-mobile">
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Condition</div>
                <Select
                  placeholder="All Conditions"
                  value={selectedCondition}
                  onChange={setSelectedCondition}
                  allowClear
                  style={{ width: '100%', height: 36 }}
                >
                  <Option value="NEW">New</Option>
                  <Option value="GOOD">Good</Option>
                  <Option value="SLIGHTLY_DAMAGED">Slightly Damaged</Option>
                  <Option value="NEEDS_REPAIR">Needs Repair</Option>
                  <Option value="SCRAP">Scrap</Option>
                </Select>
              </div>
            </Col>
            <Col xs={24} sm={12} md={5} className="hide-on-mobile">
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Status</div>
                <Select
                  placeholder="All Status"
                  value={selectedStatus}
                  onChange={setSelectedStatus}
                  allowClear
                  style={{ width: '100%', height: 36 }}
                >
                  <Option value="AVAILABLE">Available</Option>
                  <Option value="RESERVED">Reserved</Option>
                  <Option value="TRANSFERRED">Transferred</Option>
                  <Option value="ARCHIVED">Archived</Option>
                </Select>
              </div>
            </Col>
            <Col xs={24} sm={12} md={3} className="hide-on-mobile">
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>&nbsp;</div>
                <Button 
                  onClick={clearAllFilters}
                  block
                  style={{ height: 36 }}
                >
                  Clear Filters
                </Button>
              </div>
            </Col>
            <Col xs={12} className="show-on-mobile">
              <Button 
                icon={<FilterOutlined />} 
                onClick={() => setShowFilters(!showFilters)}
                block
                style={{ height: 32 }}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
            </Col>
            <Col xs={12} className="show-on-mobile">
              <Button 
                onClick={clearAllFilters}
                block
                style={{ height: 32 }}
              >
                Clear Filters
              </Button>
            </Col>
          </Row>
          <div className="show-on-mobile" style={{ display: showFilters ? 'block' : 'none' }}>
            <Row gutter={[8, 8]} align="middle">
              <Col xs={24}>
                <div style={{ padding: '8px 0' }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Date Range</div>
                  <RangePicker
                    value={dateRange}
                    onChange={handleDateRangeChange}
                    style={{ width: '100%', height: 36 }}
                  />
                </div>
              </Col>
              <Col xs={24}>
                <div style={{ padding: '8px 0' }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Item Category</div>
                  <Select
                    placeholder="All Categories"
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    allowClear
                    style={{ width: '100%', height: 36 }}
                  >
                    {categories.map((cat) => (
                      <Option key={cat._id} value={cat._id}>{cat.name}</Option>
                    ))}
                  </Select>
                </div>
              </Col>
              <Col xs={24}>
                <div style={{ padding: '8px 0' }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Condition</div>
                  <Select
                    placeholder="All Conditions"
                    value={selectedCondition}
                    onChange={setSelectedCondition}
                    allowClear
                    style={{ width: '100%', height: 36 }}
                  >
                    <Option value="NEW">New</Option>
                    <Option value="GOOD">Good</Option>
                    <Option value="SLIGHTLY_DAMAGED">Slightly Damaged</Option>
                    <Option value="NEEDS_REPAIR">Needs Repair</Option>
                    <Option value="SCRAP">Scrap</Option>
                  </Select>
                </div>
              </Col>
              <Col xs={24}>
                <div style={{ padding: '8px 0' }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Status</div>
                  <Select
                    placeholder="All Status"
                    value={selectedStatus}
                    onChange={setSelectedStatus}
                    allowClear
                    style={{ width: '100%', height: 36 }}
                  >
                    <Option value="AVAILABLE">Available</Option>
                    <Option value="RESERVED">Reserved</Option>
                    <Option value="TRANSFERRED">Transferred</Option>
                    <Option value="ARCHIVED">Archived</Option>
                  </Select>
                </div>
              </Col>
            </Row>
          </div>
        </Card>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {loading ? (
          <>
            <Col xs={24} sm={12} lg={8} xl={4}>
              <Card 
                style={{ 
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  border: '1px solid #f0f0f0'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ marginBottom: 12 }}>
                  <div className="shimmer-wrapper" style={{ height: 16, width: '60%', marginBottom: 8 }} />
                  <div className="shimmer-wrapper" style={{ height: 20, width: '40%' }} />
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8} xl={4}>
              <Card 
                style={{ 
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  border: '1px solid #f0f0f0'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ marginBottom: 12 }}>
                  <div className="shimmer-wrapper" style={{ height: 16, width: '60%', marginBottom: 8 }} />
                  <div className="shimmer-wrapper" style={{ height: 20, width: '40%' }} />
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8} xl={4}>
              <Card 
                style={{ 
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  border: '1px solid #f0f0f0'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ marginBottom: 12 }}>
                  <div className="shimmer-wrapper" style={{ height: 16, width: '60%', marginBottom: 8 }} />
                  <div className="shimmer-wrapper" style={{ height: 20, width: '40%' }} />
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8} xl={4}>
              <Card 
                style={{ 
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  border: '1px solid #f0f0f0'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ marginBottom: 12 }}>
                  <div className="shimmer-wrapper" style={{ height: 16, width: '60%', marginBottom: 8 }} />
                  <div className="shimmer-wrapper" style={{ height: 20, width: '40%' }} />
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={24} lg={16} xl={8}>
              <Card 
                style={{ 
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  border: '1px solid #0891b2',
                  background: '#e0f7fa'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ marginBottom: 12 }}>
                  <div className="shimmer-wrapper" style={{ height: 16, width: '70%', marginBottom: 8 }} />
                  <div className="shimmer-wrapper" style={{ height: 24, width: '50%' }} />
                </div>
              </Card>
            </Col>
          </>
        ) : (
          <>
            <Col xs={24} sm={12} lg={8} xl={4}>
              <Card 
                hoverable
                style={{ 
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  border: '1px solid #f0f0f0'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <Statistic
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <InboxOutlined style={{ color: '#0891b2', fontSize: 16 }} />
                      <span style={{ color: '#666', fontSize: 13 }}>Total Inventory</span>
                    </div>
                  }
                  value={stats.totalInventory}
                  valueStyle={{ 
                    color: '#0891b2', 
                    fontSize: '24px',
                    fontWeight: 600
                  }}
                  suffix={<span style={{ fontSize: 12, color: '#999' }}>items</span>}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8} xl={4}>
              <Card 
                hoverable
                style={{ 
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  border: '1px solid #f0f0f0'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <Statistic
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <CheckCircleOutlined style={{ color: '#0891b2', fontSize: 16 }} />
                      <span style={{ color: '#666', fontSize: 13 }}>Available</span>
                    </div>
                  }
                  value={stats.availableItems}
                  valueStyle={{ 
                    color: '#0891b2', 
                    fontSize: '24px',
                    fontWeight: 600
                  }}
                  suffix={<span style={{ fontSize: 12, color: '#999' }}>{stats.totalInventory > 0 ? `${Math.round((stats.availableItems / stats.totalInventory) * 100)}%` : '0%'}</span>}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8} xl={4}>
              <Card 
                hoverable
                style={{ 
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  border: '1px solid #f0f0f0'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <Statistic
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <ToolOutlined style={{ color: '#0891b2', fontSize: 16 }} />
                      <span style={{ color: '#666', fontSize: 13 }}>Surplus</span>
                    </div>
                  }
                  value={stats.surplusItems}
                  valueStyle={{ 
                    color: '#0891b2', 
                    fontSize: '24px',
                    fontWeight: 600
                  }}
                  suffix={<span style={{ fontSize: 12, color: '#999' }}>shared</span>}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8} xl={4}>
              <Card 
                hoverable
                style={{ 
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  border: '1px solid #f0f0f0'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <Statistic
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <SwapOutlined style={{ color: '#0891b2', fontSize: 16 }} />
                      <span style={{ color: '#666', fontSize: 13 }}>Procurements</span>
                    </div>
                  }
                  value={stats.procurementRequests}
                  valueStyle={{ 
                    color: '#0891b2', 
                    fontSize: '24px',
                    fontWeight: 600
                  }}
                  suffix={<span style={{ fontSize: 12, color: '#999' }}>requests</span>}
                />
              </Card>
            </Col>
            <Col xs={24} sm={24} lg={16} xl={8}>
              <Card 
                hoverable
                style={{ 
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  border: '1px solid #0891b2',
                  background: '#e0f7fa'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <Statistic
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <DollarOutlined style={{ color: '#0891b2', fontSize: 16 }} />
                      <span style={{ color: '#0891b2', fontSize: 13, fontWeight: 500 }}>Cost Avoided by Reuse</span>
                    </div>
                  }
                  value={stats.costAvoided}
                  valueStyle={{ 
                    color: '#0891b2', 
                    fontSize: '28px',
                    fontWeight: 700
                  }}
                  prefix="₹"
                  suffix={<span style={{ fontSize: 12, color: '#0891b2' }}>saved</span>}
                />
              </Card>
            </Col>
          </>
        )}
      </Row>

      {loading ? (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card title="Inventory by Status">
              <div
                style={{
                  padding: '20px 0',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 8,
                  height: 300
                }}
              >
                {[60, 100, 140, 180, 120, 90].map((height, index) => (
                  <div
                    key={index}
                    className="shimmer-wrapper"
                    style={{
                      flex: 1,
                      height,
                      borderRadius: 6
                    }}
                  />
                ))}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Inventory by Condition">
              <div
                style={{
                  padding: '20px 0',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 8,
                  height: 300
                }}
              >
                {[60, 100, 140, 180, 120, 90].map((height, index) => (
                  <div
                    key={index}
                    className="shimmer-wrapper"
                    style={{
                      flex: 1,
                      height,
                      borderRadius: 6
                    }}
                  />
                ))}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Procurement Request Trends">
              <div
                style={{
                  padding: '20px 0',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 8,
                  height: 300
                }}
              >
                {[60, 100, 140, 180, 120, 90].map((height, index) => (
                  <div
                    key={index}
                    className="shimmer-wrapper"
                    style={{
                      flex: 1,
                      height,
                      borderRadius: 6
                    }}
                  />
                ))}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Inventory by Category">
              <div
                style={{
                  padding: '20px 0',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 8,
                  height: 300
                }}
              >
                {[60, 100, 140, 180, 120, 90].map((height, index) => (
                  <div
                    key={index}
                    className="shimmer-wrapper"
                    style={{
                      flex: 1,
                      height,
                      borderRadius: 6
                    }}
                  />
                ))}
              </div>
            </Card>
          </Col>
          <Col xs={24}>
            <Card title="Material Statuses Overview">
              <div
                style={{
                  padding: '20px 0',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 8,
                  height: 300
                }}
              >
                {[60, 100, 140, 180, 120, 90].map((height, index) => (
                  <div
                    key={index}
                    className="shimmer-wrapper"
                    style={{
                      flex: 1,
                      height,
                      borderRadius: 6
                    }}
                  />
                ))}
              </div>
            </Card>
          </Col>
        </Row>
      ) : (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card 
              title="Inventory by Status"
              extra={
                <Select
                  value={statusChartType}
                  onChange={setStatusChartType}
                  style={{ width: 120 }}
                  size="small"
                >
                  <Option value="bar">Bar Chart</Option>
                  <Option value="pie">Pie Chart</Option>
                  <Option value="line">Line Chart</Option>
                  <Option value="area">Area Chart</Option>
                
                </Select>
              }
            >
              <ResponsiveContainer width="100%" height={300}>
                {statusChartType === 'bar' ? (
                  <BarChart data={availabilityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id.status" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalQuantity" fill="#0891b2" name="Total Quantity" />
                    <Bar dataKey="count" fill="#06b6d4" name="Item Count" />
                  </BarChart>
                ) : statusChartType === 'line' ? (
                  <LineChart data={availabilityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id.status" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="totalQuantity" stroke="#0891b2" name="Total Quantity" strokeWidth={2} />
                    <Line type="monotone" dataKey="count" stroke="#06b6d4" name="Item Count" strokeWidth={2} />
                  </LineChart>
                ) : statusChartType === 'area' ? (
                  <AreaChart data={availabilityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id.status" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="totalQuantity" fill="#0891b2" stroke="#0891b2" name="Total Quantity" />
                    <Area type="monotone" dataKey="count" fill="#06b6d4" stroke="#06b6d4" name="Item Count" />
                  </AreaChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={availabilityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ _id, totalQuantity }) => `${_id?.status} (${totalQuantity})`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalQuantity"
                    >
                      {availabilityData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card 
              title="Inventory by Condition"
              extra={
                <Select
                  value={conditionChartType}
                  onChange={setConditionChartType}
                  style={{ width: 120 }}
                  size="small"
                >
                  <Option value="pie">Pie Chart</Option>
                  <Option value="bar">Bar Chart</Option>
                  <Option value="line">Line Chart</Option>
                  <Option value="area">Area Chart</Option>
                </Select>
              }
            >
              <ResponsiveContainer width="100%" height={300}>
                {conditionChartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={conditionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ _id, percent }) => `${_id?.condition?.replace(/_/g, ' ')} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalQuantity"
                    >
                      {conditionData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                ) : conditionChartType === 'bar' ? (
                  <BarChart data={conditionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id.condition" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalQuantity" fill="#0891b2" name="Total Quantity" />
                  </BarChart>
                ) : conditionChartType === 'line' ? (
                  <LineChart data={conditionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id.condition" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="totalQuantity" stroke="#0891b2" name="Total Quantity" strokeWidth={2} />
                  </LineChart>
                ) : (
                  <AreaChart data={conditionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id.condition" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="totalQuantity" fill="#0891b2" stroke="#0891b2" name="Total Quantity" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card 
              title="Procurement Request Trends"
              extra={
                <Select
                  value={procurementChartType}
                  onChange={setProcurementChartType}
                  style={{ width: 120 }}
                  size="small"
                >
                  <Option value="pie">Pie Chart</Option>
                  <Option value="bar">Bar Chart</Option>
                  <Option value="line">Line Chart</Option>
                  <Option value="area">Area Chart</Option>
                 
                </Select>
              }
            >
              <ResponsiveContainer width="100%" height={300}>
                {procurementChartType === 'bar' ? (
                  <BarChart data={procurementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id.month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="approved" fill="#0891b2" name="Approved" stackId="a" />
                    <Bar dataKey="pending" fill="#06b6d4" name="Pending" stackId="a" />
                    <Bar dataKey="rejected" fill="#22d3ee" name="Rejected" stackId="a" />
                  </BarChart>
                ) : procurementChartType === 'line' ? (
                  <LineChart data={procurementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id.month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="approved" stroke="#0891b2" name="Approved" strokeWidth={2} />
                    <Line type="monotone" dataKey="pending" stroke="#06b6d4" name="Pending" strokeWidth={2} />
                    <Line type="monotone" dataKey="rejected" stroke="#22d3ee" name="Rejected" strokeWidth={2} />
                  </LineChart>
                ) : procurementChartType === 'area' ? (
                  <AreaChart data={procurementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id.month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="approved" stackId="1" fill="#0891b2" stroke="#0891b2" name="Approved" />
                    <Area type="monotone" dataKey="pending" stackId="1" fill="#06b6d4" stroke="#06b6d4" name="Pending" />
                    <Area type="monotone" dataKey="rejected" stackId="1" fill="#22d3ee" stroke="#22d3ee" name="Rejected" />
                  </AreaChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: 'Approved',
                          value: procurementData.reduce((sum, d: any) => sum + (d.approved || 0), 0)
                        },
                        {
                          name: 'Pending',
                          value: procurementData.reduce((sum, d: any) => sum + (d.pending || 0), 0)
                        },
                        {
                          name: 'Rejected',
                          value: procurementData.reduce((sum, d: any) => sum + (d.rejected || 0), 0)
                        }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {['#0891b2', '#06b6d4', '#22d3ee'].map((color, index) => (
                        <Cell key={`procurement-pie-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card 
              title="Inventory by Category"
              extra={
                <Select
                  value={categoryChartType}
                  onChange={setCategoryChartType}
                  style={{ width: 120 }}
                  size="small"
                >
                  <Option value="bar">Bar Chart</Option>
                  <Option value="line">Line Chart</Option>
                  <Option value="area">Area Chart</Option>
                  <Option value="pie">Pie Chart</Option>
                </Select>
              }
            >
              <ResponsiveContainer width="100%" height={300}>
                {categoryChartType === 'bar' ? (
                  <BarChart data={categoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="_id.category" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalQuantity" fill="#0891b2" name="Quantity" />
                    <Bar dataKey="count" fill="#06b6d4" name="Items" />
                  </BarChart>
                ) : categoryChartType === 'line' ? (
                  <LineChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id.category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="totalQuantity" stroke="#0891b2" name="Quantity" strokeWidth={2} />
                    <Line type="monotone" dataKey="count" stroke="#06b6d4" name="Items" strokeWidth={2} />
                  </LineChart>
                ) : categoryChartType === 'area' ? (
                  <AreaChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id.category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="totalQuantity" fill="#0891b2" stroke="#0891b2" name="Quantity" />
                    <Area type="monotone" dataKey="count" fill="#06b6d4" stroke="#06b6d4" name="Items" />
                  </AreaChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ _id, percent }) => `${_id?.category} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalQuantity"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24}>
            <Card 
              title="Material Statuses Overview"
              extra={
                <Select
                  value={materialStatusChartType}
                  onChange={setMaterialStatusChartType}
                  style={{ width: 120 }}
                  size="small"
                >
                  <Option value="bar">Bar Chart</Option>
                  <Option value="line">Line Chart</Option>
                  <Option value="area">Area Chart</Option>
                  <Option value="pie">Pie Chart</Option>
                </Select>
              }
            >
              <ResponsiveContainer width="100%" height={300}>
                {materialStatusChartType === 'bar' ? (
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id.status" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#0891b2" name="Material Count" />
                    <Bar dataKey="totalQuantity" fill="#06b6d4" name="Total Quantity" />
                  </BarChart>
                ) : materialStatusChartType === 'line' ? (
                  <LineChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id.status" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#0891b2" name="Material Count" strokeWidth={2} />
                    <Line type="monotone" dataKey="totalQuantity" stroke="#06b6d4" name="Total Quantity" strokeWidth={2} />
                  </LineChart>
                ) : materialStatusChartType === 'area' ? (
                  <AreaChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id.status" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="count" fill="#0891b2" stroke="#0891b2" name="Material Count" />
                    <Area type="monotone" dataKey="totalQuantity" fill="#06b6d4" stroke="#06b6d4" name="Total Quantity" />
                  </AreaChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ _id, totalQuantity }) => `${_id?.status} (${totalQuantity})`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalQuantity"
                    >
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  )
}
