'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, Shield, Brain, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex justify-center mb-6">
            <Heart className="h-16 w-16 text-connection-500 animate-heartbeat" />
          </div>
          
          <h1 className="text-5xl font-display font-bold text-gray-900 mb-6 text-balance">
            Strengthen Your Relationship with 
            <span className="connection-gradient bg-clip-text text-transparent"> AI-Powered Guidance</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto text-balance">
            A safety-first, evidence-based platform that helps couples grow stronger together 
            through personalized AI insights and professional-grade relationship tools.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-connection-500 hover:bg-connection-600"
              onClick={() => router.push('/auth')}
            >
              Start Your Journey Together
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => {
                document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">
            Built on Science, Powered by Safety
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our platform combines relationship psychology research with advanced AI 
            to provide personalized, ethical guidance for couples.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="safe-space">
            <CardHeader>
              <Shield className="h-8 w-8 text-trust-500 mb-2" />
              <CardTitle>Safety First</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Crisis detection protocols and professional referral network ensure your safety is always the priority.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="trust-indicator">
            <CardHeader>
              <Brain className="h-8 w-8 text-connection-500 mb-2" />
              <CardTitle>Evidence-Based</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                All guidance is grounded in peer-reviewed relationship psychology research and clinical best practices.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="growth-progress">
            <CardHeader>
              <Users className="h-8 w-8 text-growth-500 mb-2" />
              <CardTitle>Couple-Focused</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Designed specifically for couples to work together, with privacy controls and shared progress tracking.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="harmony-card">
            <CardHeader>
              <Heart className="h-8 w-8 text-harmony-500 mb-2" />
              <CardTitle>AI-Powered</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Advanced AI provides personalized insights while maintaining human oversight and professional standards.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="safe-space text-center max-w-2xl mx-auto">
          <h3 className="text-2xl font-display font-bold text-gray-900 mb-4">
            Ready to Strengthen Your Connection?
          </h3>
          <p className="text-gray-600 mb-6">
            Join thousands of couples who are building stronger, healthier relationships 
            with our evidence-based approach.
          </p>
          <Button 
            size="lg" 
            className="connection-gradient text-white"
            onClick={() => router.push('/auth')}
          >
            Get Started Today
          </Button>
        </div>
      </section>
    </div>
  )
}