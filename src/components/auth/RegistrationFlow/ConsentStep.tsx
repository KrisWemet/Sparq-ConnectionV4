'use client'

import React, { useState } from 'react'
import { ConsentFlow } from '../ConsentFlow/ConsentFlow'
import type { RegistrationData } from './RegistrationFlow'
import type { ConsentFormData } from '@/lib/auth/consent-management'

interface ConsentStepProps {
  data: RegistrationData
  onComplete: (data: Partial<RegistrationData>) => void
}

export const ConsentStep: React.FC<ConsentStepProps> = ({
  data,
  onComplete
}) => {
  const handleConsentComplete = (consents: ConsentFormData) => {
    onComplete({ consents })
  }

  return (
    <div className="-m-6"> {/* Remove card padding to let ConsentFlow handle its own layout */}
      <ConsentFlow
        onComplete={handleConsentComplete}
        showOptional={true}
      />
    </div>
  )
}