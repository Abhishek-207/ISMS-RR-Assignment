import React from 'react'
import { Layout, Typography, Space, Menu, Button, Drawer, message, Dropdown } from 'antd'
import { useState, useEffect } from 'react'
import { Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { MenuOutlined, LogoutOutlined, UserOutlined, DownOutlined, BellOutlined } from '@ant-design/icons'
import Login from './pages/Login'
import Landing from './pages/Landing'
import MaterialsList from './pages/MaterialsList'
import MaterialCreate from './pages/MaterialCreate'
import MaterialDetail from './pages/MaterialDetail'
import TransfersList from './pages/TransfersList'
import Masters from './pages/Masters'
import Analytics from './pages/Analytics'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import { isAdmin, getCurrentUser, getToken, clearAuth } from './lib/auth'
import { api } from './lib/api'

const { Header, Content } = Layout
const { Title, Text } = Typography

export default function App() {
  const [user, setUser] = useState(getCurrentUser())
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get('/auth/me')
        setUser(response.data.user)
        
        if (response.data.user.tenant) {
          console.log('App: Storing tenant info from /auth/me:', response.data.user.tenant)
          localStorage.setItem('tenant', response.data.user.tenant.id || 'default')
          if (response.data.user.tenant.name) {
            localStorage.setItem('tenantName', response.data.user.tenant.name)
          }
        } else {
          console.log('App: No tenant info from /auth/me, setting default')
          localStorage.setItem('tenant', 'default')
        }
      } catch (error) {
        clearAuth()
        setUser(null)
      }
    }

    if (getCurrentUser() || getToken()) {
      checkAuth()
    }
  }, [])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (e.newValue) {
          setUser(getCurrentUser())
        } else {
          setUser(null)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)

    const handleAuthChange = () => {
      setUser(getCurrentUser())
    }
    window.addEventListener('auth-changed', handleAuthChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth-changed', handleAuthChange)
    }
  }, [])

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearAuth()
      setUser(null)
      navigate('/')
      message.success('Logged out successfully')
    }
  }

  const RequireAuth = ({ children }: { children: React.ReactNode }) => {
    if (!user) {
      return <Navigate to="/login" replace />
    }
    return <>{children}</>
  }

  const RequireAdmin = ({ children }: { children: React.ReactNode }) => {
    if (!user || !isAdmin()) {
      return <Navigate to="/" replace />
    }
    return <>{children}</>
  }

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup'
  const isLoginRoute = location.pathname === '/login'
  const isSignupRoute = location.pathname === '/signup'

  const menuItems = user ? [
    {
      key: '/',
      label: 'Home'
    },
    {
      key: '/materials/new',
      label: 'List Material'
    },
    {
      key: '/materials',
      label: 'All Materials'
    },
    {
      key: '/transfers',
      label: 'Transfers'
    },
    {
      key: '/analytics',
      label: 'Analytics'
    },
    ...(isAdmin() ? [
      {
        key: '/masters',
        label: 'Configuration Settings'
      }
    ] : [])
  ] : [
    {
      key: '/',
      label: 'Home'
    }
  ]

  const userMenu = (
    <Menu
      items={[
       
        {
          key: 'profile',
          icon: <UserOutlined />,
          label: 'Profile',
          onClick: () => navigate('/profile')
        },
        {
          key: 'notifications',
          icon: <BellOutlined />,
          label: 'Notifications',
          onClick: () => navigate('/notifications')
        },
        {
          type: 'divider'
        },
        {
          key: 'logout',
          icon: <LogoutOutlined />,
          label: 'Logout',
          onClick: handleLogout
        }
      ]}
    />
  )

  const horizontalMenu = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <Menu
        mode="horizontal"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => {
          navigate(key)
          setMobileMenuOpen(false)
        }}
        style={{ border: 'none', background: 'transparent', flex: 1 }}
      />
      {user ? (
        <Space>
          <Button 
            type="text" 
            icon={<BellOutlined style={{ fontSize: '18px' }} />} 
            style={{ color: '#0891b2', fontWeight: 500 }}
            onClick={() => navigate('/notifications')}
            title="Notifications"
          />
          <Dropdown overlay={userMenu} placement="bottomRight">
            <Button type="text" style={{ color: '#0891b2', fontWeight: 700 }}>
              <Space>
                <UserOutlined />
                {user.name}
                <DownOutlined />
              </Space>
            </Button>
          </Dropdown>
        </Space>
      ) : (
        <>
          {isLoginRoute && (
            <Button type="text" style={{ color: '#0891b2', fontWeight: 500 }}>
              <Link to="/signup" style={{ color: 'inherit', textDecoration: 'none' }}>Sign Up</Link>
            </Button>
          )}
          {isSignupRoute && (
            <Button type="text" style={{ color: '#0891b2', fontWeight: 500 }}>
              <Link to="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Sign In</Link>
            </Button>
          )}
          {!isAuthRoute && (
            <Button type="text" style={{ color: '#0891b2', fontWeight: 500 }}>
              <Link to="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Sign In</Link>
            </Button>
          )}
        </>
      )}
    </div>
  )

  const mobileMenu = (
    <Menu mode="inline" selectable={false} style={{ borderRight: 'none' }}>
      <Menu.Item key="home-m"><Link to="/">Home</Link></Menu.Item>
      {user && <Menu.Item key="new-m"><Link to="/materials/new">List Material</Link></Menu.Item>}
      {user && <Menu.Item key="materials-m"><Link to="/materials">All Materials</Link></Menu.Item>}
      {user && <Menu.Item key="transfers-m"><Link to="/transfers">Transfers</Link></Menu.Item>}
      {user && <Menu.Item key="analytics-m"><Link to="/analytics">Analytics</Link></Menu.Item>}
      {user && isAdmin() && <Menu.Item key="masters-m"><Link to="/masters">Configuration settings</Link></Menu.Item>}
      {user ? (
        <Menu.Item key="org-m">
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: 'notifications', icon: <BellOutlined />, label: 'Notifications' },
                { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
                { key: 'logout', icon: <LogoutOutlined />, label: 'Logout' }
              ],
              onClick: ({ key }) => {
                if (key === 'logout') handleLogout()
                if (key === 'profile') navigate('/profile')
                if (key === 'notifications') navigate('/notifications')
              }
            }}
          >
            <Button type="text" icon={<UserOutlined />} style={{ color: '#0891b2', fontWeight: 700 }}>
              {user.name}
              <DownOutlined style={{ marginLeft: 6 }} />
            </Button>
          </Dropdown>
        </Menu.Item>
      ) : (
        <>
          {isLoginRoute && (
            <Menu.Item key="signup-m">
              <Link to="/signup">Create account</Link>
            </Menu.Item>
          )}
          {isSignupRoute && (
            <Menu.Item key="login-m">
              <Link to="/login">Sign In</Link>
            </Menu.Item>
          )}
          {!isAuthRoute && (
            <Menu.Item key="login-main">
              <Link to="/login">Sign In</Link>
            </Menu.Item>
          )}
        </>
      )}
    </Menu>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#0891b2', borderBottom: '0', position: 'sticky', top: 0, zIndex: 1000, width: '100%' }}>
        <div className="container" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }}>
          <div className="show-mobile">
            <Button aria-label="Open menu" type="text" icon={<MenuOutlined style={{ color: '#fff', marginRight: 90, fontSize: 20 }} />} onClick={() => setMobileMenuOpen(true)} />
          </div>
          <Title level={4} className="header-title" style={{ color: '#fff', display: 'flex', alignItems: 'center', margin: 10 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
              <img className="hide-mobile" src="/logo1.png" alt="ISMS" style={{ height: '30px', width: 'auto', marginRight: 10 }} />
              <span className="hide-mobile" style={{ marginTop: '15px' }}>ISMS</span>
            </Link>
          </Title>
        </div>
      </Header>

      <Drawer 
        placement="left" 
        width={280} 
        title={(
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', marginLeft: 17 }}>
            <img src="/logo1.png" alt="ISMS" style={{ height: 27, width: 'auto', marginRight: 3 }} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginTop: '10px' }}>ISMS</span>
          </Link>
        )}
        onClose={() => setMobileMenuOpen(false)} 
        open={mobileMenuOpen} 
        bodyStyle={{ padding: 0 }}
        styles={{ header: { background: '#0891b2', borderBottom: 'none' } }}
        closeIcon={<span style={{ color: '#fff', fontSize: 16 }}>✕</span>}
      >
        {mobileMenu}
      </Drawer>

      <Content style={{ padding: 24 }}>
        <div className="container">
          <div className="topnav hide-mobile">
            {horizontalMenu}
          </div>
          <Routes>
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Landing />} />
            <Route path="/materials" element={<RequireAuth><MaterialsList /></RequireAuth>} />
            <Route path="/materials/new" element={<RequireAuth><MaterialCreate /></RequireAuth>} />
            <Route path="/materials/:id" element={<RequireAuth><MaterialDetail /></RequireAuth>} />
            <Route path="/transfers" element={<RequireAuth><TransfersList /></RequireAuth>} />
            <Route path="/masters" element={<RequireAdmin><Masters /></RequireAdmin>} />
            <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
           
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Content>
      <div style={{ borderBottom: '7px solid #0891b2', background: '#fff' }}>
        <div className="container" style={{ padding: 16, textAlign: 'center' }}>
          <Text style={{ color: '#0891b2', fontSize: 14, fontWeight: 500}}>© {new Date().getFullYear()} Inventory & Surplus Management System</Text>
        </div>
      </div>
    </Layout>
  )
}
