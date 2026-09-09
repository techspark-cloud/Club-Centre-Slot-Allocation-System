import PrintReportPage from './[entity]/page';

export default function QueryPrintReportPage() {
  return <PrintReportPage params={Promise.resolve({ entity: '' })} />;
}
