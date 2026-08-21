import SaleShow from '@/pages/sales/show';

export default SaleReturnPage;

function SaleReturnPage(props: Parameters<typeof SaleShow>[0]) {
    return <SaleShow {...props} showReturnForm />;
}
