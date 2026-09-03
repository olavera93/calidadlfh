import base64
from calendar import monthrange
import io
import math
import os

from reportlab.graphics.shapes import Circle, Drawing, Line
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

LOGO_PATH = os.path.join(
    os.path.dirname(__file__), "static", "img", "logo_farmacia_homeopatica.png"
)


def _momento(hora_str: str) -> str:
    h = int((hora_str or "00")[:2])
    if h < 12:
        return "M"
    if h < 18:
        return "T"
    return "N"


def generar_pdf_temperaturas(
    area_nombre: str,
    year_month: str,
    registros: list,
    sede_nombre: str = "",
    temp_min: float = 15.0,
    temp_max: float = 25.0,
    hum_min: float = 13.0,
    hum_max: float = 27.0,
    **kwargs,
) -> io.BytesIO:
    buffer = io.BytesIO()

    # Documento en formato Carta Horizontal
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        leftMargin=0.4 * cm,
        rightMargin=0.4 * cm,
        topMargin=0.3 * cm,
        bottomMargin=0.3 * cm,
    )

    style_title = ParagraphStyle(
        "T1", fontName="Helvetica-Bold", fontSize=9, leading=11
    )
    # Estilos optimizados para evitar que los valores (ej. 18.6, 21.2) se dividan en 2 líneas
    cell_style = ParagraphStyle(
        "C1", fontName="Helvetica", fontSize=3.8, leading=4.0, alignment=1
    )
    header_style = ParagraphStyle(
        "H1", fontName="Helvetica-Bold", fontSize=4.5, leading=5.0, alignment=1
    )

    elements = []

    # ---- 1. Encabezado ----
    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=5.0 * cm, height=0.75 * cm)
    else:
        logo = Paragraph("<b>LA FARMACIA HOMEOPÁTICA</b>", style_title)

    texto_sede = f" — Sede: {sede_nombre}" if sede_nombre else ""
    titulo = Paragraph(
        f"<b>Planilla de Control de Temperatura y Humedad — {area_nombre}{texto_sede}</b><br/>Periodo: {year_month}",
        style_title,
    )
    header_table = Table([[logo, titulo]], colWidths=[5.5 * cm, 21.0 * cm])
    header_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    elements.append(header_table)
    elements.append(Spacer(1, 2))

    # ---- 2. Procesamiento de Datos ----
    year, month = map(int, year_month.split("-"))
    num_dias = monthrange(year, month)[1]

    mapa_registros = {}
    vals_t_reg, vals_h_reg = [], []

    for r in registros:
        dia = int(str(r.get("fecha")).split("-")[2])
        m = _momento(r.get("hora", ""))
        mapa_registros[(dia, m)] = r
        if r.get("temperatura") is not None:
            vals_t_reg.append(float(r["temperatura"]))
        if r.get("humedad") is not None:
            vals_h_reg.append(float(r["humedad"]))

    col_metric_w = 1.4 * cm
    col_subwidth = (27.1 * cm - col_metric_w) / (num_dias * 3)
    col_widths = [col_metric_w] + [col_subwidth] * (num_dias * 3)

    row_dias = [Paragraph("<b>Día</b>", header_style)]
    for d in range(1, num_dias + 1):
        row_dias.extend([Paragraph(f"<b>{d}</b>", header_style), "", ""])

    row_turnos = [Paragraph("<b>Turno</b>", header_style)]
    for d in range(1, num_dias + 1):
        row_turnos.extend(
            [
                Paragraph("M", header_style),
                Paragraph("T", header_style),
                Paragraph("N", header_style),
            ]
        )

    # ---- 3. ESCALAS DINÁMICAS Y AUTO-AJUSTABLES ----
    todas_temps = [temp_min, temp_max] + vals_t_reg
    min_t = min(todas_temps)
    max_t = max(todas_temps)

    t_start = max(0.0, float(math.floor(min_t - 1.0)))
    t_end = float(math.ceil(max_t + 1.0))
    # Genera escala de 1 en 1 incluyendo min y max
    escala_temp = [round(t_end - i * 1.0, 1) for i in range(int(t_end - t_start) + 1)]

    # --- CORRECCIÓN EN HUMEDAD: Incluir explícitamente hum_min y hum_max ---
    todas_hums = [hum_min, hum_max] + vals_h_reg
    min_h = min(todas_hums)
    max_h = max(todas_hums)

    h_start = max(0.0, float(math.floor(min_h - 2.0)))
    h_end = float(math.ceil(max_h + 2.0))
    step_h = 2.0 if (h_end - h_start) <= 20 else 5.0

    raw_escala_h = [round(h_end - i * step_h, 1) for i in range(int((h_end - h_start) / step_h) + 1)]
    # Añadimos los límites exactos si no están en el paso regular
    set_h = set(raw_escala_h)
    set_h.add(round(float(hum_min), 1))
    set_h.add(round(float(hum_max), 1))
    escala_hum = sorted(list(set_h), reverse=True)

    # Cálculo dinámico de altura por fila
    num_filas_totales = len(escala_temp) + len(escala_hum) + 5
    if num_filas_totales > 35:
        ROW_H = 0.22 * cm
    elif num_filas_totales > 25:
        ROW_H = 0.25 * cm
    else:
        ROW_H = 0.28 * cm

    OFFSET_X = 0.85

    # ---- 4. SECCIÓN TEMPERATURA ----
    table_temp_data = [row_dias, row_turnos]
    puntos_temp = []

    for val in escala_temp:
        table_temp_data.append([Paragraph(f"<b>{val}°C</b>", header_style)] + [""] * (num_dias * 3))

    row_temp_num = [Paragraph("<b>Valor °C</b>", header_style)]

    for d in range(1, num_dias + 1):
        for m_idx, m in enumerate(["M", "T", "N"]):
            col_index = 1 + (d - 1) * 3 + m_idx
            reg = mapa_registros.get((d, m))

            if reg:
                t_val = reg.get("temperatura")
                t_str = f"{t_val:.1f}" if t_val is not None else "—"
                if reg.get("alerta"):
                    t_str = f"<font color='red'><b>{t_str}</b></font>"

                row_temp_num.append(Paragraph(t_str, cell_style))
                if t_val is not None:
                    puntos_temp.append((col_index, float(t_val)))
            else:
                row_temp_num.append(Paragraph("—", cell_style))

    table_temp_data.append(row_temp_num)

    # Damos mayor altura a la fila de los números (ROW_H * 1.5)
    row_heights_temp = [ROW_H] * (len(table_temp_data) - 1) + [ROW_H * 1.5]

    t_style_temp = [
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#9CA3AF")),
        ("BACKGROUND", (0, 0), (-1, 1), colors.HexColor("#E5E7EB")),
        ("BACKGROUND", (0, 2), (0, -1), colors.HexColor("#F3F4F6")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("SPAN", (0, 0), (0, 1)),
    ]

    for i in range(num_dias):
        t_style_temp.append(("SPAN", (1 + i * 3, 0), (3 + i * 3, 0)))

    # Resaltado de límites Máximo y Mínimo en Temperatura
    for idx_row, val in enumerate(escala_temp, start=2):
        if val == temp_max:
            t_style_temp.append(("BACKGROUND", (1, idx_row), (-1, idx_row), colors.HexColor("#FEE2E2")))
        elif val == temp_min:
            t_style_temp.append(("BACKGROUND", (1, idx_row), (-1, idx_row), colors.HexColor("#DCFCE7")))

    tabla_temp = Table(table_temp_data, colWidths=col_widths, rowHeights=row_heights_temp)
    tabla_temp.setStyle(TableStyle(t_style_temp))
    elements.append(tabla_temp)

    # ---- DIBUJAR LÍNEA TEMPERATURA ----
    if puntos_temp:
        grid_top_y_t = sum(row_heights_temp)

        d_overlay_t = Drawing(27.1 * cm, grid_top_y_t)
        puntos_xy = []

        for col_idx, val in puntos_temp:
            x = col_metric_w + (col_idx - OFFSET_X) * col_subwidth

            if val in escala_temp:
                idx_escala = float(escala_temp.index(val))
            else:
                p_max, p_min = escala_temp[0], escala_temp[-1]
                idx_escala = (p_max - val) / (p_max - p_min) * (len(escala_temp) - 1)

            fila_desde_arriba = 2.0 + idx_escala
            y = grid_top_y_t - (fila_desde_arriba + 0.5) * ROW_H
            puntos_xy.append((x, y))

        for i in range(len(puntos_xy) - 1):
            d_overlay_t.add(Line(puntos_xy[i][0], puntos_xy[i][1], puntos_xy[i + 1][0], puntos_xy[i + 1][1], strokeColor=colors.HexColor("#2563EB"), strokeWidth=1.2))

        for x, y in puntos_xy:
            d_overlay_t.add(Circle(x, y, 1.6, fillColor=colors.HexColor("#DC2626"), strokeColor=colors.white, strokeWidth=0.4))

        elements.append(Spacer(1, -grid_top_y_t))
        elements.append(d_overlay_t)

    elements.append(Spacer(1, 2))

    # ---- 5. SECCIÓN HUMEDAD ----
    table_hum_data = [row_turnos]
    puntos_hum = []

    for val in escala_hum:
        table_hum_data.append([Paragraph(f"<b>{val}%</b>", header_style)] + [""] * (num_dias * 3))

    row_hum_num = [Paragraph("<b>Valor %</b>", header_style)]

    for d in range(1, num_dias + 1):
        for m_idx, m in enumerate(["M", "T", "N"]):
            col_index = 1 + (d - 1) * 3 + m_idx
            reg = mapa_registros.get((d, m))

            if reg:
                h_val = reg.get("humedad")
                h_str = f"{h_val:.1f}" if h_val is not None else "—"
                row_hum_num.append(Paragraph(h_str, cell_style))

                if h_val is not None:
                    puntos_hum.append((col_index, float(h_val)))
            else:
                row_hum_num.append(Paragraph("—", cell_style))

    table_hum_data.append(row_hum_num)

    # Damos mayor altura a la fila de los números (ROW_H * 1.5)
    row_heights_hum = [ROW_H] * (len(table_hum_data) - 1) + [ROW_H * 1.5]

    t_style_hum = [
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#9CA3AF")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E5E7EB")),
        ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#F3F4F6")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]

    # --- APLICACIÓN DE COLORES PARA MÁXIMO Y MÍNIMO EN HUMEDAD ---
    for idx_row, val in enumerate(escala_hum, start=1):
        if val == hum_max:
            t_style_hum.append(("BACKGROUND", (1, idx_row), (-1, idx_row), colors.HexColor("#FEE2E2")))
        elif val == hum_min:
            t_style_hum.append(("BACKGROUND", (1, idx_row), (-1, idx_row), colors.HexColor("#DCFCE7")))

    tabla_hum = Table(table_hum_data, colWidths=col_widths, rowHeights=row_heights_hum)
    tabla_hum.setStyle(TableStyle(t_style_hum))
    elements.append(tabla_hum)

    # ---- DIBUJAR LÍNEA HUMEDAD ----
    if puntos_hum:
        grid_top_y_h = sum(row_heights_hum)

        d_overlay_h = Drawing(27.1 * cm, grid_top_y_h)
        puntos_xy = []

        for col_idx, val in puntos_hum:
            x = col_metric_w + (col_idx - OFFSET_X) * col_subwidth

            if val in escala_hum:
                idx_escala = float(escala_hum.index(val))
            else:
                p_max, p_min = escala_hum[0], escala_hum[-1]
                idx_escala = (p_max - val) / (p_max - p_min) * (len(escala_hum) - 1)

            fila_desde_arriba = 1.0 + idx_escala
            y = grid_top_y_h - (fila_desde_arriba + 0.5) * ROW_H
            puntos_xy.append((x, y))

        for i in range(len(puntos_xy) - 1):
            d_overlay_h.add(Line(puntos_xy[i][0], puntos_xy[i][1], puntos_xy[i + 1][0], puntos_xy[i + 1][1], strokeColor=colors.HexColor("#0891B2"), strokeWidth=1.2))

        for x, y in puntos_xy:
            d_overlay_h.add(Circle(x, y, 1.6, fillColor=colors.HexColor("#0284C7"), strokeColor=colors.white, strokeWidth=0.4))

        elements.append(Spacer(1, -grid_top_y_h))
        elements.append(d_overlay_h)

    doc.build(elements)
    buffer.seek(0)
    return buffer