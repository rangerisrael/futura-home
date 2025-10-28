import MainLayout from '@/components/common/layout'
import Complaints from '@/components/features/complaints'

const ComplaintsPage = () => {
  return (
    <MainLayout currentPageName="complaints">
        <Complaints />
    </MainLayout>
  )
}
export default ComplaintsPage