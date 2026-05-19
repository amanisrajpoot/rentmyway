/**
 * Utility to export an array of flat objects to a CSV file on the client side.
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;

  // Get headers from keys
  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add header row
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      let strVal = val === null || val === undefined ? '' : String(val);
      
      // Escape double quotes
      strVal = strVal.replace(/"/g, '""');
      
      // Wrap in double quotes if it contains comma, newline or quotes
      if (strVal.includes(',') || strVal.includes('\n') || strVal.includes('"')) {
        strVal = `"${strVal}"`;
      }
      return strVal;
    });
    csvRows.push(values.join(','));
  }

  // Add BOM for proper UTF-8 Excel handling
  const csvContent = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
