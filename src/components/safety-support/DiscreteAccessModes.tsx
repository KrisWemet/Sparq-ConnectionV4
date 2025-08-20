'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface DiscreteAccessModesProps {
  open: boolean
  onClose: () => void
}

export default function DiscreteAccessModes({
  open,
  onClose
}: DiscreteAccessModesProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Discrete Access Modes</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            This feature allows you to access safety resources discretely in case you are being monitored.
            This feature is currently under development and will be available soon.
          </p>
          <div className="mt-4">
            <Button onClick={() => onClose()}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}