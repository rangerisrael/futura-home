import MainLayout from '@/components/common/layout'
import Appointments from '@/components/features/reservations'



const ReservationsPage = () => {
  return (
    <MainLayout currentPageName="Appointments">
        <Appointments/>
    </MainLayout>
  )
}

export default ReservationsPage