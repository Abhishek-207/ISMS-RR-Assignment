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
  DollarOutlined
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
  Cell
} from 'recharts'
import dayjs from 'dayjs'
import { api } from '../lib/api'
import { getOrganizationCategory } from '../lib/auth'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

const COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#f5222d', '#722ed1']

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
                Category: {orgCategory.replace(/_/g, ' ')}
              </Text>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={clearAllFilters}>
              Clear Filters
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
            <Col xs={24} sm={12} md={6}>
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Date Range</div>
                <RangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  style={{ width: '100%', height: 36 }}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={5}>
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
            <Col xs={24} sm={12} md={5}>
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
            <Col xs={24} sm={12} md={5}>
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
        </Card>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
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
                  <InboxOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                  <span style={{ color: '#666', fontSize: 13 }}>Total Inventory</span>
                </div>
              }
              value={stats.totalInventory}
              valueStyle={{ 
                color: '#1890ff', 
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
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                  <span style={{ color: '#666', fontSize: 13 }}>Available</span>
                </div>
              }
              value={stats.availableItems}
              valueStyle={{ 
                color: '#52c41a', 
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
                  <ToolOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
                  <span style={{ color: '#666', fontSize: 13 }}>Surplus</span>
                </div>
              }
              value={stats.surplusItems}
              valueStyle={{ 
                color: '#fa8c16', 
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
                  <SwapOutlined style={{ color: '#722ed1', fontSize: 16 }} />
                  <span style={{ color: '#666', fontSize: 13 }}>Procurements</span>
                </div>
              }
              value={stats.procurementRequests}
              valueStyle={{ 
                color: '#722ed1', 
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
              border: '1px solid #52c41a',
              background: '#f6ffed'
            }}
            bodyStyle={{ padding: '16px' }}
          >
            <Statistic
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <DollarOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                  <span style={{ color: '#52c41a', fontSize: 13, fontWeight: 500 }}>Cost Avoided by Reuse</span>
                </div>
              }
              value={stats.costAvoided}
              valueStyle={{ 
                color: '#52c41a', 
                fontSize: '28px',
                fontWeight: 700
              }}
              prefix="₹"
              suffix={<span style={{ fontSize: 12, color: '#52c41a' }}>saved</span>}
            />
          </Card>
        </Col>
      </Row>

      {loading ? (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card title="Inventory by Status">
              <div style={{ padding: '20px 0' }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="shimmer-wrapper" style={{ marginBottom: 10, height: 40, borderRadius: 6 }} />
                ))}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Inventory by Condition">
              <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <div className="shimmer-wrapper" style={{ width: 180, height: 180, borderRadius: '50%' }} />
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Procurement Request Trends">
              <div style={{ padding: '20px 0' }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="shimmer-wrapper" style={{ marginBottom: 10, height: 40, borderRadius: 6 }} />
                ))}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Inventory by Category">
              <div style={{ padding: '20px 0' }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="shimmer-wrapper" style={{ marginBottom: 10, height: 40, borderRadius: 6 }} />
                ))}
              </div>
            </Card>
          </Col>
        </Row>
      ) : (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card title="Inventory by Status">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={availabilityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id.status" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalQuantity" fill="#1890ff" name="Total Quantity" />
                  <Bar dataKey="count" fill="#52c41a" name="Item Count" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Inventory by Condition">
              <ResponsiveContainer width="100%" height={300}>
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
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Procurement Request Trends">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={procurementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id.month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="approved" fill="#52c41a" name="Approved" stackId="a" />
                  <Bar dataKey="pending" fill="#fa8c16" name="Pending" stackId="a" />
                  <Bar dataKey="rejected" fill="#f5222d" name="Rejected" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Inventory by Category">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="_id.category" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalQuantity" fill="#1890ff" name="Quantity" />
                  <Bar dataKey="count" fill="#722ed1" name="Items" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24}>
            <Card title="Material Statuses Overview">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id.status" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#fa8c16" name="Material Count" />
                  <Bar dataKey="totalQuantity" fill="#52c41a" name="Total Quantity" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  )
}
