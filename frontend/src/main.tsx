import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './styles.css'

const queryClient = new QueryClient()

;(() => {
  const host = window.location.host
  const parts = host.split('.')
  const sub = parts.length > 2 ? parts[0] : 'default'

  const current = localStorage.getItem('tenant')
  if (!current) {
    localStorage.setItem('tenant', sub)
  }
})()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#0891b2',
            fontFamily: 'var(--app-font, "Nunito Variable"), Nunito, system-ui, -apple-system, Segoe UI, Roboto, Inter, Outfit, Arial, sans-serif'
          },
          algorithm: antdTheme.defaultAlgorithm
        }}
      >
        <AntdApp>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
