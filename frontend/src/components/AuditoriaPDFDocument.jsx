import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#0f172a',
    margin: -30,
    marginBottom: 20,
    padding: 20,
    borderBottomWidth: 3,
    borderBottomColor: '#0284c7',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCol: {
    width: '24%',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: {
    fontSize: 7,
    color: '#64748b',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: {
    fontSize: 9,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  metricCard: {
    width: '19%',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    textAlign: 'center',
  },
  metricVal: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  metricLbl: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  table: {
    width: '100%',
    marginTop: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    padding: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 6,
  },
  th: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase',
  },
  td: {
    fontSize: 8,
    color: '#334155',
  },
  callout: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    padding: 8,
    marginTop: 8,
    borderRadius: 4,
  },
  calloutText: {
    fontSize: 8.5,
    color: '#78350f',
  },
})

const formatDate = (val) => {
  if (!val) return '—'
  const d = new Date(val)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

export const AuditoriaPDFDocument = ({ auditoria, tareas, metricas }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={styles.title}>{auditoria?.nombre_auditoria || 'Informe de Auditoría'}</Text>
        <Text style={styles.subtitle}>
          Estado: {(auditoria?.estado || '').toUpperCase()} | Documento: {auditoria?.documento_adt || 'N/A'}
        </Text>
      </View>

      {/* Ficha General */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información General</Text>
        <View style={styles.grid}>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Auditor</Text>
            <Text style={styles.value}>{auditoria?.nombre_auditor || '—'}</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Sede</Text>
            <Text style={styles.value}>{auditoria?.sede?.nombre || '—'}</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Programada</Text>
            <Text style={styles.value}>{formatDate(auditoria?.fecha_programada)}</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Ejecución</Text>
            <Text style={styles.value}>{formatDate(auditoria?.fecha_ejecucion)}</Text>
          </View>
        </View>

        {auditoria?.novedades && (
          <View style={styles.callout}>
            <Text style={[styles.label, { color: '#b45309' }]}>Novedades y Observaciones</Text>
            <Text style={styles.calloutText}>{auditoria.novedades}</Text>
          </View>
        )}
      </View>

      {/* Resumen Métrico */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumen de Tareas</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLbl}>Total</Text>
            <Text style={[styles.metricVal, { color: '#0f172a' }]}>{metricas.total}</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: '#fffbeb' }]}>
            <Text style={styles.metricLbl}>Pendientes</Text>
            <Text style={[styles.metricVal, { color: '#b45309' }]}>{metricas.pendientes}</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: '#f0f9ff' }]}>
            <Text style={styles.metricLbl}>En Proceso</Text>
            <Text style={[styles.metricVal, { color: '#0369a1' }]}>{metricas.enProceso}</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: '#f0fdf4' }]}>
            <Text style={styles.metricLbl}>Completadas</Text>
            <Text style={[styles.metricVal, { color: '#15803d' }]}>{metricas.completadas}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLbl}>% Avance</Text>
            <Text style={[styles.metricVal, { color: '#0284c7' }]}>{metricas.porcentaje}%</Text>
          </View>
        </View>
      </View>

      {/* Tabla de Tareas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detalle de Tareas ({tareas.length})</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: '35%' }]}>Tarea / Observación</Text>
            <Text style={[styles.th, { width: '15%' }]}>Estado</Text>
            <Text style={[styles.th, { width: '25%' }]}>Inicio</Text>
            <Text style={[styles.th, { width: '25%' }]}>Fin</Text>
          </View>
          {tareas.map((t) => (
            <View key={t.id} style={styles.tableRow}>
              <View style={{ width: '35%' }}>
                <Text style={[styles.td, { fontWeight: 'bold' }]}>{t.nombre_tarea}</Text>
                {t.comentario && <Text style={[styles.td, { color: '#64748b', fontSize: 7 }]}>{t.comentario}</Text>}
              </View>
              <Text style={[styles.td, { width: '15%', fontWeight: 'bold' }]}>{t.estado}</Text>
              <Text style={[styles.td, { width: '25%' }]}>{formatDate(t.fecha_inicio)}</Text>
              <Text style={[styles.td, { width: '25%' }]}>{formatDate(t.fecha_fin)}</Text>
            </View>
          ))}
        </View>
      </View>
    </Page>
  </Document>
)