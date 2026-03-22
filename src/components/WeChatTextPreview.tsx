import { useState } from 'react'
import { Button, TextArea, Toast, Card } from 'antd-mobile'

interface WeChatTextPreviewProps {
  text: string
}

export default function WeChatTextPreview({ text }: WeChatTextPreviewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      Toast.show({ icon: 'success', content: '已复制到剪贴板', duration: 2000 })
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      Toast.show({ icon: 'success', content: '已复制到剪贴板', duration: 2000 })
    }
  }

  return (
    <Card
      title="微信通知文本"
      extra={
        <Button
          size="small"
          color={copied ? 'success' : 'primary'}
          onClick={() => void handleCopy()}
        >
          {copied ? '✓ 已复制' : '📋 复制'}
        </Button>
      }
    >
      <TextArea
        value={text}
        readOnly
        rows={8}
        style={{ fontSize: '13px', fontFamily: 'monospace' }}
      />
    </Card>
  )
}
