'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Share2, MessageCircle, Mail, CheckCircle } from 'lucide-react'

interface InviteShareProps {
  inviteLink: string
  inviteCode: string
}

export default function InviteShare({ inviteLink, inviteCode }: InviteShareProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = inviteLink
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareViaText = () => {
    const message = `Hi! I'd like you to join me on Sparq Connection, an app that helps couples strengthen their relationship. Click this link to connect with me: ${inviteLink}`
    
    // Try to open SMS app with pre-filled message
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`
    window.open(smsUrl, '_self')
  }

  const shareViaEmail = () => {
    const subject = 'Join me on Sparq Connection'
    const body = `Hi there!

I'd love for you to join me on Sparq Connection, an app that helps couples strengthen their relationship through evidence-based tools and guidance.

Click this link to connect with me and start our wellness journey together:
${inviteLink}

Or you can use the invite code: ${inviteCode}

Looking forward to growing together!`

    const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(emailUrl)
  }

  const shareViaWebShare = async () => {
    if (!navigator.share) {
      // Fallback to copying link
      await copyToClipboard()
      return
    }

    try {
      await navigator.share({
        title: 'Join me on Sparq Connection',
        text: 'I\'d like you to join me on Sparq Connection to strengthen our relationship together.',
        url: inviteLink
      })
    } catch (error) {
      console.error('Error sharing:', error)
      // Fallback to copying link
      await copyToClipboard()
    }
  }

  return (
    <div className="space-y-4">
      {/* Copy Link Button */}
      <Button
        onClick={copyToClipboard}
        variant="outline"
        className="w-full"
      >
        {copied ? (
          <>
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </>
        )}
      </Button>

      {/* Share Options */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={shareViaText}
          variant="outline"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-3"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs">Text</span>
        </Button>
        
        <Button
          onClick={shareViaEmail}
          variant="outline"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-3"
        >
          <Mail className="h-4 w-4" />
          <span className="text-xs">Email</span>
        </Button>
        
        <Button
          onClick={shareViaWebShare}
          variant="outline"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-3"
        >
          <Share2 className="h-4 w-4" />
          <span className="text-xs">More</span>
        </Button>
      </div>

      {/* Link Preview */}
      <div className="bg-gray-50 border rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 mb-1">Invite Link:</p>
            <p className="text-sm text-gray-600 truncate font-mono">{inviteLink}</p>
          </div>
          <Button
            onClick={copyToClipboard}
            variant="ghost"
            size="sm"
            className="ml-2 flex-shrink-0"
          >
            {copied ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Sharing Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Sharing Tips:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Share this link only with your partner</li>
          <li>• The invite expires in 7 days</li>
          <li>• Each invite can only be used once</li>
          <li>• Your partner will need to create an account to accept</li>
        </ul>
      </div>
    </div>
  )
}