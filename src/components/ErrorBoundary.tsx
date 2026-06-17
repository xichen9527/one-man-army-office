import React from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props { children: React.ReactNode }
interface State { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null }
  errorInfo: React.ErrorInfo | null = null

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.errorInfo = info
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="max-w-md text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-lg font-semibold text-gray-900">页面渲染异常</h2>
            <pre className="text-sm text-red-600 bg-red-50 rounded-lg p-4 text-left overflow-auto max-h-48">
              {this.state.error?.stack || this.state.error?.message}
            </pre>
            {this.errorInfo?.componentStack && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  组件堆栈
                </summary>
                <pre className="text-xs text-gray-600 bg-gray-100 rounded p-2 mt-2 overflow-auto max-h-32">
                  {this.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <Button variant="outline" onClick={() => this.setState({ hasError: false, error: null })}>
              重试
            </Button>
            <Button variant="ghost" onClick={() => window.location.href = '/dashboard'}>
              返回工作台
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
