/** §30 — CSV / Excel Export */

export type Row = Record<string, string | number | null | undefined>

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: Row[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(',')),
  ]
  // Excel 이 UTF-8 을 인식하도록 BOM 을 붙인다.
  return `﻿${lines.join('\r\n')}`
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Excel 로 열리는 XML Spreadsheet 2003 형식.
 * 바이너리 xlsx 라이브러리를 추가하지 않고 서식 있는 표를 내보낸다.
 */
export function toExcelXml(rows: Row[], sheetName = 'Sheet1'): string {
  if (rows.length === 0) rows = [{ '': '' }]
  const headers = Object.keys(rows[0])
  const headerCells = headers
    .map((h) => `<Cell ss:StyleID="hdr"><Data ss:Type="String">${esc(h)}</Data></Cell>`)
    .join('')
  const body = rows
    .map((row) => {
      const cells = headers
        .map((h) => {
          const v = row[h]
          const isNumber = typeof v === 'number' && Number.isFinite(v)
          return `<Cell><Data ss:Type="${isNumber ? 'Number' : 'String'}">${esc(v)}</Data></Cell>`
        })
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="hdr">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F2F54" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${esc(sheetName)}">
  <Table>
   <Row>${headerCells}</Row>
   ${body}
  </Table>
 </Worksheet>
</Workbook>`
}
