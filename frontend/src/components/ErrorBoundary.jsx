import React from 'react'

// 页面级错误边界：捕获渲染期异常，避免整页白屏。
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('页面渲染错误:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen grid place-items-center bg-[#f8fafc] p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h1 className="text-lg font-bold text-[#0f172a] mb-2">页面出错了</h1>
            <p className="text-sm text-[#475569] mb-4">
              出现了一个意外错误，你可以刷新页面重试。
            </p>
            <pre className="text-left text-[11px] text-[#94a3b8] bg-[#f1f5f9] rounded-lg p-3 mb-5 overflow-auto max-h-32">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-[#06b6d4] text-white text-sm font-semibold hover:opacity-90"
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
