import { useState, useEffect } from 'react'
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  DatePicker, 
  Statistic,
  Spin,
  Select,
  Button
} from 'antd'
import { 
  InboxOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  ToolOutlined,
  DownloadOutlined
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

const { Title } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

const COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#f5222d', '#722ed1']

export default function Analytics() {
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(6, 'month'),
    dayjs()
  ])
  
  // Filter states
  const [selectedSite, setSelectedSite] = useState<string | undefined>(undefined)
  const [selectedMaterialType, setSelectedMaterialType] = useState<string | undefined>(undefined)
  const [selectedCondition, setSelectedCondition] = useState<string | undefined>(undefined)
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined)

  const [availabilityData, setAvailabilityData] = useState<any[]>([])
  const [transferData, setTransferData] = useState<any[]>([])
  const [conditionData, setConditionData] = useState<any[]>([])
  const [siteData, setSiteData] = useState<any[]>([])
  const [utilizationData, setUtilizationData] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalMaterials: 0,
    availableMaterials: 0,
    reservedMaterials: 0,
    inUseMaterials: 0,
    transferredMaterials: 0
  })

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Dummy data for stats
      setStats({
        totalMaterials: 1250,
        availableMaterials: 450,
        reservedMaterials: 320,
        inUseMaterials: 480,
        transferredMaterials: 180
      })

      // Dummy data for material availability by status
      setAvailabilityData([
        { '_id': { 'status': 'AVAILABLE' }, 'totalQuantity': 450, 'count': 120 },
        { '_id': { 'status': 'RESERVED' }, 'totalQuantity': 320, 'count': 85 },
        { '_id': { 'status': 'IN_USE' }, 'totalQuantity': 480, 'count': 95 },
        { '_id': { 'status': 'TRANSFERRED' }, 'totalQuantity': 180, 'count': 45 }
      ])

      // Dummy data for material condition distribution
      setConditionData([
        { '_id': { 'condition': 'EXCELLENT' }, 'totalQuantity': 380, 'count': 95 },
        { '_id': { 'condition': 'GOOD' }, 'totalQuantity': 520, 'count': 130 },
        { '_id': { 'condition': 'FAIR' }, 'totalQuantity': 280, 'count': 70 },
        { '_id': { 'condition': 'POOR' }, 'totalQuantity': 70, 'count': 18 }
      ])

      // Dummy data for transfer trends (last 6 months)
      setTransferData([
        { '_id': { 'month': '2024-01' }, 'totalQuantity': 45, 'count': 12 },
        { '_id': { 'month': '2024-02' }, 'totalQuantity': 52, 'count': 15 },
        { '_id': { 'month': '2024-03' }, 'totalQuantity': 38, 'count': 10 },
        { '_id': { 'month': '2024-04' }, 'totalQuantity': 65, 'count': 18 },
        { '_id': { 'month': '2024-05' }, 'totalQuantity': 42, 'count': 11 },
        { '_id': { 'month': '2024-06' }, 'totalQuantity': 58, 'count': 16 }
      ])

      // Dummy data for site-wise distribution
      setSiteData([
        { '_id': { 'site': 'Site A - Mumbai' }, 'totalQuantity': 320, 'count': 85 },
        { '_id': { 'site': 'Site B - Delhi' }, 'totalQuantity': 280, 'count': 75 },
        { '_id': { 'site': 'Site C - Bangalore' }, 'totalQuantity': 250, 'count': 65 },
        { '_id': { 'site': 'Site D - Chennai' }, 'totalQuantity': 200, 'count': 55 },
        { '_id': { 'site': 'Site E - Pune' }, 'totalQuantity': 180, 'count': 45 }
      ])

      // Dummy data for utilization trends
      setUtilizationData([
        { '_id': { 'month': '2024-01' }, 'totalQuantity': 120, 'count': 25 },
        { '_id': { 'month': '2024-02' }, 'totalQuantity': 135, 'count': 28 },
        { '_id': { 'month': '2024-03' }, 'totalQuantity': 110, 'count': 22 },
        { '_id': { 'month': '2024-04' }, 'totalQuantity': 145, 'count': 32 },
        { '_id': { 'month': '2024-05' }, 'totalQuantity': 130, 'count': 27 },
        { '_id': { 'month': '2024-06' }, 'totalQuantity': 155, 'count': 35 }
      ])

    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange, selectedSite, selectedMaterialType, selectedCondition, selectedStatus])

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setDateRange(dates)
    }
  }

  const clearAllFilters = () => {
    setSelectedSite(undefined)
    setSelectedMaterialType(undefined)
    setSelectedCondition(undefined)
    setSelectedStatus(undefined)
    setDateRange([dayjs().subtract(6, 'month'), dayjs()])
  }

  const handleExportReport = async () => {
    setExportLoading(true)
    try {
      // Build query parameters for the export API
      const params = new URLSearchParams()
      
      if (dateRange[0]) {
        params.append('fromDate', dateRange[0].format('YYYY-MM-DD'))
      }
      if (dateRange[1]) {
        params.append('toDate', dateRange[1].format('YYYY-MM-DD'))
      }
      if (selectedSite) {
        params.append('siteId', selectedSite)
      }
      if (selectedMaterialType) {
        params.append('categoryId', selectedMaterialType)
      }
      if (selectedCondition) {
        params.append('condition', selectedCondition)
      }
      if (selectedStatus) {
        params.append('status', selectedStatus)
      }
      
      // Call the backend export API
      const response = await api.get(`/analytics/export?${params.toString()}`, {
        responseType: 'blob'
      })
      
      // Create and download file
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
          <Title level={4} style={{ margin: 0 }}>
            Analytics 
          </Title>
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
              Clear All Filters
            </Button>
          </div>
        </div>
        
        {/* Filters Row */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={[8, 0]} align="middle" style={{ minHeight: 60 }}>
            <Col span={4}>
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Date Range</div>
                <RangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  style={{ width: '100%', height: 36 }}
                />
              </div>
            </Col>
            <Col span={4}>
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Site</div>
                <Select
                  placeholder="All Sites"
                  value={selectedSite}
                  onChange={setSelectedSite}
                  allowClear
                  style={{ width: '100%', height: 36 }}
                >
                  <Option value="Site A - Mumbai">Site A - Mumbai</Option>
                  <Option value="Site B - Delhi">Site B - Delhi</Option>
                  <Option value="Site C - Bangalore">Site C - Bangalore</Option>
                  <Option value="Site D - Chennai">Site D - Chennai</Option>
                  <Option value="Site E - Pune">Site E - Pune</Option>
                </Select>
              </div>
            </Col>
            <Col span={4}>
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Material Type</div>
                <Select
                  placeholder="All Types"
                  value={selectedMaterialType}
                  onChange={setSelectedMaterialType}
                  allowClear
                  style={{ width: '100%', height: 36 }}
                >
                  <Option value="Steel">Steel</Option>
                  <Option value="Concrete">Concrete</Option>
                  <Option value="Wood">Wood</Option>
                  <Option value="Electrical">Electrical</Option>
                  <Option value="Plumbing">Plumbing</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </div>
            </Col>
            <Col span={4}>
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Condition</div>
                <Select
                  placeholder="All Conditions"
                  value={selectedCondition}
                  onChange={setSelectedCondition}
                  allowClear
                  style={{ width: '100%', height: 36 }}
                >
                  <Option value="EXCELLENT">Excellent</Option>
                  <Option value="GOOD">Good</Option>
                  <Option value="FAIR">Fair</Option>
                  <Option value="POOR">Poor</Option>
                </Select>
              </div>
            </Col>
            <Col span={4}>
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
                  <Option value="IN_USE">In Use</Option>
                  <Option value="TRANSFERRED">Transferred</Option>
                </Select>
              </div>
            </Col>
          </Row>
        </Card>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
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
                  <span style={{ color: '#666', fontSize: 13 }}>Total Materials</span>
                </div>
              }
              value={stats.totalMaterials}
              valueStyle={{ 
                color: '#1890ff', 
                fontSize: '24px',
                fontWeight: 600
              }}
              suffix={
                <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>
                  items
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
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
              value={stats.availableMaterials}
              valueStyle={{ 
                color: '#52c41a', 
                fontSize: '24px',
                fontWeight: 600
              }}
              suffix={
                <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>
                  {stats.totalMaterials > 0 ? `${Math.round((stats.availableMaterials / stats.totalMaterials) * 100)}%` : '0%'}
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
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
                  <ClockCircleOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
                  <span style={{ color: '#666', fontSize: 13 }}>Reserved</span>
                </div>
              }
              value={stats.reservedMaterials}
              valueStyle={{ 
                color: '#fa8c16', 
                fontSize: '24px',
                fontWeight: 600
              }}
              suffix={
                <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>
                  {stats.totalMaterials > 0 ? `${Math.round((stats.reservedMaterials / stats.totalMaterials) * 100)}%` : '0%'}
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
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
                  <ToolOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                  <span style={{ color: '#666', fontSize: 13 }}>In Use</span>
                </div>
              }
              value={stats.inUseMaterials}
              valueStyle={{ 
                color: '#1890ff', 
                fontSize: '24px',
                fontWeight: 600
              }}
              suffix={
                <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>
                  {stats.totalMaterials > 0 ? `${Math.round((stats.inUseMaterials / stats.totalMaterials) * 100)}%` : '0%'}
                </span>
              }
            />
          </Card>
        </Col>
      </Row>

      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          {/* Material Availability by Status */}
          <Col xs={24} lg={12}>
            <Card title="Material Availability by Status">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={availabilityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id.status" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                   <Bar dataKey="totalQuantity" fill="#1890ff" name="Total Quantity" />
                  <Bar dataKey="count" fill="#52c41a" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          {/* Material Condition Distribution */}
          <Col xs={24} lg={12}>
            <Card title="Material Condition Distribution">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={conditionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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

          {/* Transfer Trends */}
          <Col xs={24} lg={12}>
            <Card title="Transfer Trends">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={transferData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id.month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                   <Line 
                     type="monotone" 
                     dataKey="totalQuantity" 
                     stroke="#1890ff" 
                     name="Quantity Transferred"
                   />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#52c41a" 
                    name="Transfer Count"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          {/* Site-wise Distribution */}
          <Col xs={24} lg={12}>
            <Card title="Site-wise Material Distribution">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={siteData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id.site" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                   <Bar dataKey="totalQuantity" fill="#1890ff" name="Total Quantity" />
                  <Bar dataKey="count" fill="#52c41a" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          {/* Utilization Trends */}
          <Col xs={24}>
            <Card title="Material Utilization Trends">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={utilizationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id.month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                   <Line 
                     type="monotone" 
                     dataKey="totalQuantity" 
                     stroke="#1890ff" 
                     name="Quantity Utilized"
                   />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#52c41a" 
                    name="Utilization Count"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  )
}
