import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 找到 index.html 中的 #root，并把 React 应用挂载进去。
// StrictMode 只在开发环境帮助发现副作用问题，不会影响生产构建。
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
