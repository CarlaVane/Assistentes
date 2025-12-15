import { SymptomFormPreloader } from "@/components/symptom-form-preloader"

export default function SymptomsPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-cyan-50">
      <SymptomFormPreloader minLoadingDuration={5000} />
    </div>
  )
}
