// hooks/useChartCapture.js
import html2canvas from 'html2canvas'

export async function captureChartAsBase64(ref) {
  if (!ref?.current) return null
  const canvas = await html2canvas(ref.current, {
    backgroundColor: '#ffffff',
    scale: 2, // mayor resolución para el PDF
  })
  return canvas.toDataURL('image/png').split(',')[1] // solo el base64, sin el prefijo
}