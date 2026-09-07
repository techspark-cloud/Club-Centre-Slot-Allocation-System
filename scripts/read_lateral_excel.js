const xlsx = require('xlsx');

try {
  const filePath = 'C:\\Users\\hp\\Downloads\\Lateral Entry 2025-2029.xlsx';
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log('Headers:', data[0]);
  console.log('Sample Row 1:', data[1]);
  console.log('Sample Row 2:', data[2]);
  console.log('Total Rows:', data.length);
} catch (e) {
  console.error('Error reading excel file:', e);
}
