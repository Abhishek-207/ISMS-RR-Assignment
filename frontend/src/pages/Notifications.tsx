import React, { useEffect, useState } from 'react'
import { Card, List, Typography, Tag, Button, Empty, Space, Badge, message } from 'antd'
import { BellOutlined, CheckOutlined, DeleteOutlined, InfoCircleOutlined, ExclamationCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { Grid } from 'antd'
import { api } from '../lib/api'

const { Title, Text } = Typography
const { useBreakpoint } = Grid

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  timestamp: string
  read: boolean
  priority: 'low' | 'medium' | 'high'
}

export default function Notifications() {
  const screens = useBreakpoint()
  const isMobile = !screens.md
  
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'red'
      case 'medium':
        return 'orange'
      default:
        return 'green'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true)
      try {
        const response = await api.get('/notifications', {
          params: {
            page: 1,
            pageSize: 50
          }
        })

        const items = response.data?.data || []
        
        const mapped: Notification[] = items.map((item: any) => ({
          id: item._id,
          title: item.title,
          message: item.message,
          type: item.type,
          timestamp: item.createdAt,
          read: item.read,
          priority: item.priority
        }))

        setNotifications(mapped)
      } catch (error) {
        console.error('Failed to load notifications', error)
        message.error('Failed to load notifications')
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [])

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, read: true }
            : notification
        )
      )
      message.success('Notification marked as read')
    } catch (error) {
      console.error('Failed to mark notification as read', error)
      message.error('Failed to mark notification as read')
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read')
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      )
      message.success('All notifications marked as read')
    } catch (error) {
      console.error('Failed to mark all notifications as read', error)
      message.error('Failed to mark all notifications as read')
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications(prev => prev.filter(notification => notification.id !== id))
      message.success('Notification deleted')
    } catch (error) {
      console.error('Failed to delete notification', error)
      message.error('Failed to delete notification')
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div style={{ display: 'grid', gap: isMobile ? 12 : 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ marginTop: 0, marginBottom: 0 }}>
        
          Notifications
          {unreadCount > 0 && (
            <Badge count={unreadCount} style={{ marginLeft: 8 }} />
          )}
        </Title>
        {unreadCount > 0 && (
          <Button 
            type="primary" 
            size="small"
            onClick={markAllAsRead}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      {loading && notifications.length === 0 ? (
        <Card bodyStyle={{ padding: isMobile ? 12 : 16 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 12,
                padding: isMobile ? 8 : 12,
                marginBottom: 8,
                borderRadius: 8,
                backgroundColor: '#fff',
                border: '1px solid #f0f0f0'
              }}
            >
              <div className="shimmer-wrapper shimmer-circle" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="shimmer-wrapper" style={{ height: 18, width: '60%' }} />
                  <div className="shimmer-wrapper" style={{ height: 20, width: 60, borderRadius: 4 }} />
                </div>
                <div className="shimmer-wrapper" style={{ height: 16, width: '90%' }} />
                <div className="shimmer-wrapper" style={{ height: 14, width: '40%' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <div className="shimmer-wrapper" style={{ height: 24, width: 24, borderRadius: 4 }} />
                <div className="shimmer-wrapper" style={{ height: 24, width: 24, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No notifications yet"
          />
        </Card>
      ) : (
        <Card bodyStyle={{ padding: isMobile ? 12 : 16 }}>
          <List
            dataSource={notifications}
            loading={loading && notifications.length > 0}
            renderItem={(notification) => (
              <List.Item
                style={{
                  backgroundColor: notification.read ? 'transparent' : '#f6ffed',
                  border: notification.read ? 'none' : '1px solid #b7eb8f',
                  borderRadius: 8,
                  marginBottom: 8,
                  padding: isMobile ? 8 : 12
                }}
                actions={[
                  <Button
                    key="read"
                    type="text"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={() => markAsRead(notification.id)}
                    disabled={notification.read}
                    title="Mark as read"
                  />,
                  <Button
                    key="delete"
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => deleteNotification(notification.id)}
                    title="Delete notification"
                  />
                ]}
              >
                <List.Item.Meta
                  avatar={getNotificationIcon(notification.type)}
                  title={
                    <Space>
                      <Text strong={!notification.read}>{notification.title}</Text>
                      <Tag color={getPriorityColor(notification.priority)}>
                        {notification.priority.toUpperCase()}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <Text type={notification.read ? 'secondary' : undefined}>
                        {notification.message}
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {formatTimestamp(notification.timestamp)}
                        </Text>
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  )
}
