import ProgressIndicator from '@/components/shared/ProgressIndicator'
import HeroSection from '@/components/sections/HeroSection'
import OverviewSection from '@/components/sections/OverviewSection'
import StatsSection from '@/components/sections/StatsSection'
import CoreUtilitiesSection from '@/components/sections/CoreUtilitiesSection'
import ExtendedUseCasesSection from '@/components/sections/ExtendedUseCasesSection'
import RoadmapSection from '@/components/sections/RoadmapSection'
import ConceptSummarySection from '@/components/sections/ConceptSummarySection'
import CTANewsletterBanner from '@/components/sections/CTANewsletterBanner'
import FooterSection from '@/components/sections/FooterSection'

export default function Home() {
  return (
    <main className="relative">
      <ProgressIndicator />
      <HeroSection />
      <OverviewSection />
      <StatsSection />
      <CoreUtilitiesSection />
      <ExtendedUseCasesSection />
      <RoadmapSection />
      <ConceptSummarySection />
      <CTANewsletterBanner />
      <FooterSection />
    </main>
  )
}
