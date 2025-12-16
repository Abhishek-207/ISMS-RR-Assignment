import { useState, useEffect } from 'react'
import { Button, Typography, Grid } from 'antd'
import { Link } from 'react-router-dom'
import { getCurrentUser } from '../lib/auth'

const { Title, Paragraph, Text } = Typography
const { useBreakpoint } = Grid

export default function Landing() {
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [user, setUser] = useState(getCurrentUser())
  const [tenantName, setTenantName] = useState(() => {
    const storedTenantName = localStorage.getItem('tenantName')
    const storedTenant = localStorage.getItem('tenant')
    return storedTenantName || storedTenant || ''
  })

  useEffect(() => {
    const handleAuthChange = () => {
      setUser(getCurrentUser())
      const storedTenantName = localStorage.getItem('tenantName')
      const storedTenant = localStorage.getItem('tenant')
      setTenantName(storedTenantName || storedTenant || '')
    }
    
    window.addEventListener('auth-changed', handleAuthChange)
    
    return () => {
      window.removeEventListener('auth-changed', handleAuthChange)
    }
  }, [])

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>('.lift-reveal')
    if (!elements.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('lift-reveal-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.2 }
    )

    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  const isLoggedIn = Boolean(user)

  const features = [
    { icon: '📦', title: 'Inventory Management', description: "Track and manage your organization's inventory in real-time with detailed categorization and status tracking" },
    { icon: '🔄', title: 'Surplus Exchange', description: 'Discover and procure surplus items from other organizations, reducing waste and optimizing resource utilization' },
    { icon: '🤝', title: 'Collaboration', description: 'Connect with other organizations, request transfers, and build a network of resource sharing' },
    { icon: '📊', title: 'Analytics & Insights', description: 'Get valuable insights into your inventory patterns, transfer history, and resource utilization metrics' },
    { icon: '🔐', title: 'Secure Access', description: 'Role-based access control ensures data security with different permissions for admins, managers, and staff' },
    { icon: '🔔', title: 'Real-time Notifications', description: 'Stay updated with instant notifications for transfer requests, approvals, and inventory changes' },
  ]

  const steps = [
    { number: 1, title: 'Join Organization', description: 'Sign up and join your organization to get started' },
    { number: 2, title: 'Add Inventory', description: 'Add your materials with details, quantities, and categories' },
    { number: 3, title: 'Browse & Connect', description: 'Discover surplus items from other organizations' },
    { number: 4, title: 'Request Transfer', description: 'Submit requests and collaborate to share resources' },
  ]

  const benefits = [
    { icon: '💰', title: 'Cost Reduction', description: 'Save money by acquiring surplus items at reduced costs instead of purchasing new materials' },
    { icon: '♻️', title: 'Sustainability', description: 'Reduce waste and environmental impact by reusing materials and extending their lifecycle' },
    { icon: '⚡', title: 'Efficiency', description: 'Streamline inventory management with automated tracking and easy-to-use interfaces' },
    { icon: '🌐', title: 'Network Building', description: 'Connect with other organizations and build valuable partnerships for future collaboration' },
  ]

  return (
    <div>
      <div className="hero" style={{ 
        margin: isMobile ? '8px -16px 28px' : '20px auto 56px',
        maxWidth: isMobile ? 'calc(100% + 32px)' : 1280,
      }}>
        <div className="container" style={{ display: 'grid', gap: isMobile ? 16 : 20 }}>
          <Title 
            style={{ 
              margin: 0, 
              color: '#fff', 
              fontSize: isMobile ? 26 : 40,
              lineHeight: 1.2,
              textAlign: isMobile ? 'center' : 'left',
              fontWeight: 600,
            }}
          >
            Inventory & Surplus Management System
          </Title>
          <Paragraph 
            style={{ 
              maxWidth: 700, 
              margin: '0',
              fontSize: isMobile ? 15 : 18, 
              color: 'rgba(255,255,255,0.92)',
              textAlign: isMobile ? 'center' : 'left',
              lineHeight: 1.7,
            }}
          >
            Manage your organization's inventory efficiently and discover surplus resources from other organizations. Connect, collaborate, and optimize resource utilization across organizational boundaries.
          </Paragraph>
          {isLoggedIn ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-start',
              alignItems: isMobile ? 'stretch' : 'center', 
              gap: 12,
              flexWrap: 'wrap',
              flexDirection: isMobile ? 'column' : 'row',
              width: '100%',
              maxWidth: isMobile ? 420 : 360,
            }}>
              <Button 
                type="primary" 
                size={isMobile ? 'middle' : 'large'} 
                disabled 
                style={{ 
                  background: '#0891b2', 
                  borderColor: '#0891b2',
                  width: isMobile ? '100%' : 'auto',
                }}
              >
                <Text strong style={{ color: '#fff' }}>
                  {user?.organization?.name ? `Welcome to ${user?.organization?.name}` : 'Welcome'}
                </Text>
              </Button>
              <Link to="/inventory/new" style={{ width: isMobile ? '100%' : 'auto' }}>
                <Button 
                  size={isMobile ? 'middle' : 'large'}
                  className="list-item-btn"
                  style={{ 
                    background: '#fff', 
                    color: '#000', 
                    borderColor: '#fff',
                    fontWeight: 500,
                    minWidth: isMobile ? 100 : 100,
                    width: isMobile ? '100%' : 'auto',
                  }}
                >
                  List Item
                </Button>
              </Link>
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              gap: 12,
              justifyContent: 'flex-start',
              flexWrap: 'wrap',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'flex-start',
              width: '100%',
              maxWidth: isMobile ? 420 : 360,
            }}>
              <Link to="/signup" style={{ width: isMobile ? '100%' : 'auto' }}>
                <Button 
                  type="primary" 
                  size={isMobile ? 'middle' : 'large'}
                  style={{ 
                    background: '#0891b2', 
                    borderColor: '#0891b2',
                    fontWeight: 500,
                    minWidth: isMobile ? 200 : 180,
                    width: isMobile ? '100%' : 'auto',
                  }}
                >
                  Join an Organization
                </Button>
              </Link>
              <Link to="/login" style={{ width: isMobile ? '100%' : 'auto' }}>
                <Button 
                  size={isMobile ? 'middle' : 'large'}
                  className="signin-btn"
                  style={{ 
                    background: '#fff', 
                    color: '#000', 
                    borderColor: '#fff',
                    fontWeight: 500,
                    minWidth: isMobile ? 120 : 100,
                    width: isMobile ? '100%' : 'auto',
                  }}
                >
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div 
        className="container landing-mobile-tight" 
        style={{ 
          marginTop: isMobile ? 20 : 32, 
          display: 'grid', 
          gap: isMobile ? 12 : 16, 
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
        }}
      >
        {[
          'Manage inventory across organizations',
          'Discover and procure surplus items',
          'Category-based collaboration',
          'Secure & role-based access control',
        ].map((text, index) => (
          <div 
            key={index}
            className="feature-card" 
            style={{ 
              background: '#fff', 
              border: '0.5px solid #e8f4f8', 
              borderRadius: 12, 
              padding: isMobile ? 16 : 20,
              textAlign: 'left',
            }}
          >
            <Text style={{ fontSize: isMobile ? 14 : 15, color: '#333' }}>
              <span style={{ color: '#0891b2', marginRight: 8 }}>✔</span>
              {text}
            </Text>
          </div>
        ))}
      </div>

      <div className="container landing-mobile-tight" style={{ marginTop: isMobile ? 16 : 24, textAlign: 'center' }}>
        <Paragraph style={{ 
          margin: 0, 
          color: '#555', 
          fontSize: isMobile ? 15 : 16,
          fontWeight: 400,
        }}>
          Share resources. Reduce waste. Build sustainable communities.
        </Paragraph>
      </div>

      {!isLoggedIn && (
        <>
          <div style={{ 
            background: 'transparent', 
            padding: isMobile ? '40px 0' : '60px 0', 
            marginTop: isMobile ? 32 : 48,
            borderRadius: isMobile ? 0 : '24px 24px 0 0',
          }}>
            <div className="container landing-mobile-tight">
              <Title 
                level={2} 
                style={{ 
                  textAlign: 'center', 
                  color: '#0891b2', 
                  marginBottom: 8,
                  fontSize: isMobile ? 24 : 32,
                }}
              >
                Key Features
              </Title>
              <Paragraph style={{ 
                textAlign: 'center', 
                color: '#666', 
                marginBottom: isMobile ? 28 : 40,
                fontSize: isMobile ? 14 : 16,
              }}>
                Everything you need to manage inventory and collaborate across organizations
              </Paragraph>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
                gap: isMobile ? 16 : 24,
              }}>
                {features.map((feature, index) => (
                  <div 
                    key={index}
                    className="feature-card lift-reveal"
                    style={{ 
                      background: '#fff', 
                      border: '0.5px solid #e8f4f8', 
                      borderRadius: 16, 
                      padding: isMobile ? 24 : 32,
                      textAlign: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      animationDelay: `calc(0.15s + ${index} * var(--uplift-delay-step))`,
                    }}
                  >
                    <div style={{ fontSize: isMobile ? 36 : 48, marginBottom: 16 }}>
                      {feature.icon}
                    </div>
                    <Title level={4} style={{ marginTop: 0, marginBottom: 12, color: '#222', textAlign: 'center' }}>
                      {feature.title}
                    </Title>
                    <Paragraph style={{ margin: 0, color: '#666', fontSize: isMobile ? 13 : 14, lineHeight: 1.6, textAlign: 'center' }}>
                      {feature.description}
                    </Paragraph>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ 
            background: 'transparent', 
            padding: isMobile ? '40px 0' : '60px 0',
          }}>
            <div className="container landing-mobile-tight">
              <Title 
                level={2} 
                style={{ 
                  textAlign: 'center', 
                  color: '#0891b2', 
                  marginBottom: 8,
                  fontSize: isMobile ? 24 : 32,
                }}
              >
                How It Works
              </Title>
              <Paragraph style={{ 
                textAlign: 'center', 
                color: '#666', 
                marginBottom: isMobile ? 28 : 40,
                fontSize: isMobile ? 14 : 16,
              }}>
                Simple steps to start managing and sharing resources
              </Paragraph>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', 
                gap: isMobile ? 16 : 20,
              }}>
                {steps.map((step, index) => (
                  <div 
                    key={step.number}
                    className="feature-card lift-reveal"
                    style={{ 
                      background: '#fff', 
                      border: '1px solid #e8f4f8', 
                      borderRadius: 16, 
                      padding: isMobile ? 18 : 22,
                      boxShadow: '0 6px 16px rgba(0,0,0,0.05)',
                      display: 'grid',
                      gap: 10,
                      alignItems: 'flex-start',
                      animationDelay: `calc(0.15s + ${index} * var(--uplift-delay-step))`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ 
                        width: isMobile ? 48 : 54, 
                        height: isMobile ? 48 : 54, 
                        borderRadius: 14, 
                        background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 6px 14px rgba(8, 145, 178, 0.28)',
                      }}>
                        <Text style={{ 
                          color: '#fff', 
                          fontSize: isMobile ? 20 : 22, 
                          fontWeight: 700,
                        }}>
                          {step.number}
                        </Text>
                      </div>
                      <Text style={{ color: '#0891b2', fontWeight: 600, fontSize: isMobile ? 12 : 13 }}>
                      
                      </Text>
                    </div>
                    <Title level={4} style={{ margin: 0, color: '#222' }}>
                      {step.title}
                    </Title>
                    <Paragraph style={{ margin: 0, color: '#666', fontSize: isMobile ? 13 : 14, lineHeight: 1.6 }}>
                      {step.description}
                    </Paragraph>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ 
            background: 'transparent', 
            padding: isMobile ? '40px 0' : '60px 0',
          }}>
            <div className="container landing-mobile-tight">
              <Title 
                level={2} 
                style={{ 
                  textAlign: 'center', 
                  color: '#0891b2', 
                  marginBottom: 8,
                  fontSize: isMobile ? 24 : 32,
                }}
              >
                Why Choose Us?
              </Title>
              <Paragraph style={{ 
                textAlign: 'center', 
                color: '#666', 
                marginBottom: isMobile ? 28 : 40,
                fontSize: isMobile ? 14 : 16,
              }}>
                Benefits that make a real difference for your organization
              </Paragraph>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', 
                gap: isMobile ? 16 : 20,
              }}>
                {benefits.map((benefit, index) => (
                  <div 
                    key={index}
                    className="feature-card lift-reveal"
                    style={{ 
                      background: '#fff',
                      border: '1px solid #e8f4f8', 
                      borderRadius: 16, 
                      padding: isMobile ? 20 : 24,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 16,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                      animationDelay: `calc(0.12s + ${index} * var(--uplift-delay-step))`,
                    }}
                  >
                    <div style={{ fontSize: isMobile ? 28 : 32, flexShrink: 0 }}>
                      {benefit.icon}
                    </div>
                    <div>
                      <Title level={5} style={{ marginTop: 0, marginBottom: 8, color: '#222' }}>
                        {benefit.title}
                      </Title>
                      <Paragraph style={{ margin: 0, color: '#666', fontSize: isMobile ? 13 : 14, lineHeight: 1.6 }}>
                        {benefit.description}
                      </Paragraph>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div 
            className="lift-reveal"
            style={{ 
            background: '#0891b2', 
            padding: isMobile ? '20px 0' : '30px 0',
            borderRadius: 16,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 14px 40px rgba(8, 145, 178, 0.35)',
            animationDelay: '0.18s',
          }}>
            <div 
              aria-hidden="true"
              style={{ 
                position: 'absolute',
                top: isMobile ? -140 : -180,
                left: isMobile ? -140 : -200,
                width: isMobile ? 380 : 520,
                height: isMobile ? 380 : 520,
                background: 'radial-gradient(90% 90% at 0% 0%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.18) 55%, rgba(255,255,255,0.0) 75%)',
                filter: 'blur(10px)',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
            <div 
              aria-hidden="true"
              style={{ 
                position: 'absolute',
                bottom: isMobile ? -140 : -180,
                right: isMobile ? -140 : -200,
                width: isMobile ? 360 : 500,
                height: isMobile ? 360 : 500,
                background: 'radial-gradient(90% 90% at 100% 100%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.2) 55%, rgba(255,255,255,0.0) 74%)',
                filter: 'blur(10px)',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
            <div className="container landing-mobile-tight" style={{ textAlign: 'center' }}>
              <Title 
                level={2} 
                style={{ 
                  color: '#fff', 
                  marginBottom: isMobile ? 8 : 12,
                  fontSize: isMobile ? 22 : 34,
                }}
              >
                Ready to Get Started?
              </Title>
              <Paragraph style={{ 
                color: 'rgba(255,255,255,0.9)', 
                fontSize: isMobile ? 14 : 18,
                maxWidth: 500,
                margin: '0 auto',
                marginBottom: isMobile ? 20 : 32,
                paddingLeft: isMobile ? 8 : 0,
                paddingRight: isMobile ? 8 : 0,
              }}>
                Join hundreds of organizations collaborating and sharing resources seamlessly.
              </Paragraph>
              <div style={{ 
                display: 'flex', 
                gap: 12,
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap',
                flexDirection: isMobile ? 'column' : 'row',
              }}>
                <Link to="/signup" style={{ width: isMobile ? '80%' : 'auto' }}>
                  <Button 
                    size={isMobile ? 'middle' : 'large'}
                    className="signin-btn"
                    style={{ 
                      background: '#fff', 
                      color: '#000', 
                      borderColor: '#fff',
                      fontWeight: 500,
                      minWidth: isMobile ? 160 : 180,
                      width: isMobile ? '100%' : 'auto',
                    }}
                  >
                    Join Your Organization
                  </Button>
                </Link>
                <Link to="/login" style={{ width: isMobile ? '80%' : 'auto' }}>
                  <Button 
                    size={isMobile ? 'middle' : 'large'}
                      className="signin-btn"
                    style={{ 
                      background: '#fff', 
                      color: '#000', 
                      borderColor: '#fff',
                      fontWeight: 500,
                      minWidth: isMobile ? 120 : 140,
                      width: isMobile ? '100%' : 'auto',
                    }}
                  >
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
