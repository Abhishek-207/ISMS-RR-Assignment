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
  Cell,
  LineChart,
  Line
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

  const [availabilityData, setAvailabilityData] = useState<any[]>([])
  const [procurementData, setProcurementData] = useState<any[]>([])
  const [conditionData, setConditionData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [surplusData, setSurplusData] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalInventory: 0,
    availableItems: 0,
    surplusItems: 0,
    procurementRequests: 0,
    costAvoided: 0
  })

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 800))

      setStats({
        totalInventory: 1250,
        availableItems: 450,
        surplusItems: 180,
        procurementRequests: 45,
        costAvoided: 2450000
      })

      setAvailabilityData([
        { '_id': { 'status': 'AVAILABLE' }, 'totalQuantity': 450, 'count': 120 },
        { '_id': { 'status': 'RESERVED' }, 'totalQuantity': 320, 'count': 85 },
        { '_id': { 'status': 'TRANSFERRED' }, 'totalQuantity': 180, 'count': 45 },
        { '_id': { 'status': 'ARCHIVED' }, 'totalQuantity': 100, 'count': 25 }
      ])

      setConditionData([
        { '_id': { 'condition': 'NEW' }, 'totalQuantity': 380, 'count': 95 },
        { '_id': { 'condition': 'GOOD' }, 'totalQuantity': 520, 'count': 130 },
        { '_id': { 'condition': 'SLIGHTLY_DAMAGED' }, 'totalQuantity': 180, 'count': 45 },
        { '_id': { 'condition': 'NEEDS_REPAIR' }, 'totalQuantity': 70, 'count': 18 },
        { '_id': { 'condition': 'SCRAP' }, 'totalQuantity': 30, 'count': 8 }
      ])

      setProcurementData([
        { '_id': { 'month': '2024-07' }, 'approved': 12, 'pending': 3, 'rejected': 2 },
        { '_id': { 'month': '2024-08' }, 'approved': 15, 'pending': 5, 'rejected': 1 },
        { '_id': { 'month': '2024-09' }, 'approved': 10, 'pending': 2, 'rejected': 3 },
        { '_id': { 'month': '2024-10' }, 'approved': 18, 'pending': 4, 'rejected': 2 },
        { '_id': { 'month': '2024-11' }, 'approved': 11, 'pending': 6, 'rejected': 1 },
        { '_id': { 'month': '2024-12' }, 'approved': 16, 'pending': 8, 'rejected': 2 }
      ])

      setCategoryData([
        { '_id': { 'category': 'Electronics' }, 'totalQuantity': 320, 'count': 85 },
        { '_id': { 'category': 'Furniture' }, 'totalQuantity': 280, 'count': 75 },
        { '_id': { 'category': 'Raw Materials' }, 'totalQuantity': 250, 'count': 65 },
        { '_id': { 'category': 'Equipment' }, 'totalQuantity': 200, 'count': 55 },
        { '_id': { 'category': 'Office Supplies' }, 'totalQuantity': 180, 'count': 45 }
      ])

      setSurplusData([
        { '_id': { 'month': '2024-07' }, 'markedSurplus': 25, 'procured': 18 },
        { '_id': { 'month': '2024-08' }, 'markedSurplus': 32, 'procured': 22 },
        { '_id': { 'month': '2024-09' }, 'markedSurplus': 28, 'procured': 20 },
        { '_id': { 'month': '2024-10' }, 'markedSurplus': 35, 'procured': 28 },
        { '_id': { 'month': '2024-11' }, 'markedSurplus': 30, 'procured': 24 },
        { '_id': { 'month': '2024-12' }, 'markedSurplus': 38, 'procured': 30 }
      ])

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
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
          <div style={{ display: 'flex', gap: 8 }}>
            <Button 
              onClick={handleExportReport} 
              type="primary" 
              icon={<DownloadOutlined />}
              loading={exportLoading}
            >
              Export Report
            </Button>
            <Button onClick={clearAllFilters} type="default">
              Clear Filters
            </Button>
          </div>
        </div>
        
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={[8, 0]} align="middle" style={{ minHeight: 60 }}>
            <Col span={6}>
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Date Range</div>
                <RangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  style={{ width: '100%', height: 36 }}
                />
              </div>
            </Col>
            <Col span={5}>
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Item Category</div>
                <Select
                  placeholder="All Categories"
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  allowClear
                  style={{ width: '100%', height: 36 }}
                >
                  <Option value="electronics">Electronics</Option>
                  <Option value="furniture">Furniture</Option>
                  <Option value="raw-materials">Raw Materials</Option>
                  <Option value="equipment">Equipment</Option>
                  <Option value="office-supplies">Office Supplies</Option>
                </Select>
              </div>
            </Col>
            <Col span={5}>
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
            <Col span={5}>
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
        <Col xs={24} sm={12} md={4}>
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
        <Col xs={24} sm={12} md={4}>
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
        <Col xs={24} sm={12} md={4}>
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
        <Col xs={24} sm={12} md={4}>
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
        <Col xs={24} sm={24} md={8}>
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
            <Card title="Surplus Activity Trends">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={surplusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id.month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="markedSurplus" 
                    stroke="#fa8c16" 
                    name="Marked as Surplus"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="procured" 
                    stroke="#52c41a" 
                    name="Procured by Others"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  )
}
