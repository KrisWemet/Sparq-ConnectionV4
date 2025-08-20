'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, Smartphone, AlertCircle } from 'lucide-react'
import QRCode from 'qrcode'

interface QRCodeGeneratorProps {
  inviteLink: string
  inviteCode: string
}

export default function QRCodeGenerator({ inviteLink, inviteCode }: QRCodeGeneratorProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [error, setError] = useState<string>('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    generateQRCode()
  }, [inviteLink])

  const generateQRCode = async () => {
    try {
      setError('')
      
      // Generate QR code with custom options
      const canvas = canvasRef.current
      if (!canvas) return

      await QRCode.toCanvas(canvas, inviteLink, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1f2937', // Gray-800
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      })

      // Also create data URL for download
      const dataUrl = await QRCode.toDataURL(inviteLink, {
        width: 512,
        margin: 2,
        color: {
          dark: '#1f2937',
          light: '#ffffff'
        }
      })
      
      setQrDataUrl(dataUrl)

    } catch (error) {
      console.error('Error generating QR code:', error)
      setError('Failed to generate QR code')
    }
  }

  const downloadQRCode = () => {
    if (!qrDataUrl) return

    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `sparq-invite-${inviteCode}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const shareQRCode = async () => {
    if (!qrDataUrl) return

    try {
      // Convert data URL to blob
      const response = await fetch(qrDataUrl)
      const blob = await response.blob()
      
      const file = new File([blob], `sparq-invite-${inviteCode}.png`, { 
        type: 'image/png' 
      })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Join me on Sparq Connection',
          text: 'Scan this QR code to connect with me on Sparq Connection and start our relationship wellness journey together!',
          files: [file]
        })
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(inviteLink)
        // You might want to show a toast here
      }
    } catch (error) {
      console.error('Error sharing QR code:', error)
      // Fallback: copy link to clipboard
      try {
        await navigator.clipboard.writeText(inviteLink)
      } catch (clipboardError) {
        console.error('Error copying to clipboard:', clipboardError)
      }
    }
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* QR Code Display */}
      <div className="flex justify-center">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <canvas 
            ref={canvasRef} 
            className="block"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Smartphone className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">How to use this QR code:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Have your partner open their camera app</li>
              <li>• Point the camera at the QR code</li>
              <li>• Tap the notification that appears</li>
              <li>• They'll be taken to the invite acceptance page</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={downloadQRCode}
          variant="outline"
          className="flex-1"
          disabled={!qrDataUrl}
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        
        <Button
          onClick={shareQRCode}
          variant="outline"
          className="flex-1"
          disabled={!qrDataUrl}
        >
          <Smartphone className="h-4 w-4 mr-2" />
          Share
        </Button>
      </div>

      {/* Alternative sharing note */}
      <p className="text-xs text-gray-500 text-center">
        Your partner can also visit the invite link directly: <br />
        <code className="bg-gray-100 px-1 rounded text-xs">{inviteLink}</code>
      </p>
    </div>
  )
}