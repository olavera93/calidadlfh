import io
import os

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
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


def generar_pdf_devolucion(devoluciones: list) -> io.BytesIO:
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        leftMargin=0.8 * cm,
        rightMargin=0.8 * cm,
        topMargin=2.5 * cm,
        bottomMargin=0.8 * cm,
    )

    # ---------- Estilos ----------
    bold8 = ParagraphStyle("bold8", fontName="Helvetica-Bold", fontSize=8, leading=10)
    regular7 = ParagraphStyle(
        "regular7", fontName="Helvetica", fontSize=7, leading=8, alignment=TA_CENTER
    )
    regular7_left = ParagraphStyle(
        "regular7_left", fontName="Helvetica", fontSize=7, leading=8, alignment=TA_LEFT
    )
    header_cell = ParagraphStyle(
        "header_cell",
        fontName="Helvetica-Bold",
        fontSize=7,
        leading=8,
        alignment=TA_CENTER,
    )
    big_number = ParagraphStyle(
        "big_number", fontName="Helvetica-Bold", fontSize=22, alignment=TA_CENTER
    )

    label_style = ParagraphStyle(
        "label_style", fontName="Helvetica-Bold", fontSize=7, leading=8
    )
    value_style = ParagraphStyle(
        "value_style", fontName="Helvetica-Bold", fontSize=7, leading=8, alignment=TA_LEFT
    )

    elements = []
    primer_item = devoluciones[0] if devoluciones else None

    # ---------- Datos base ----------
    fecha_registro = ""
    if primer_item and getattr(primer_item, "fecha_creacion", None):
        fc = primer_item.fecha_creacion
        fecha_registro = str(fc.date()) if hasattr(fc, "date") else str(fc)

    prov_nombre = (
        primer_item.proveedor.nombre
        if primer_item and getattr(primer_item, "proveedor", None)
        else ""
    )
    obs_general = (
        primer_item.observaciones
        if primer_item and getattr(primer_item, "observaciones", None)
        else ""
    )

    # ---------- CABECERA SUPERIOR ----------
    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=6.5 * cm, height=1.05 * cm)
    else:
        logo = Paragraph("<b>LA FARMACIA HOMEOPÁTICA</b>", bold8)

    # Mismo diseño que el pie de página (columna etiqueta + columna valor, sin fondo gris)
    info_box_data = [
        [Paragraph("FECHA:", label_style), Paragraph(fecha_registro, value_style)],
        [Paragraph("PROVEEDOR:", label_style), Paragraph(prov_nombre.upper(), value_style)],
        [Paragraph("OBSERVACIONES:", label_style), Paragraph(obs_general.upper(), value_style)],
    ]
    
    info_box_table = Table(
        info_box_data, 
        colWidths=[2.8 * cm, 16.54 * cm], 
        rowHeights=[0.55 * cm, 0.55 * cm, 0.55 * cm],
        hAlign="CENTER"
    )
    info_box_table.setStyle(
        TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ])
    )

    top_layout_data = [[logo, info_box_table]]
    top_layout = Table(top_layout_data, colWidths=[7.0 * cm, 19.34 * cm], hAlign="CENTER")
    top_layout.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ])
    )
    elements.append(top_layout)
    elements.append(Spacer(1, 10))

    # ---------- TABLA PRINCIPAL ----------
    headers = [
        "N° FACTURA",
        "DESCRIPCIÓN DEL\nPRODUCTO FARMACÉUTICO",
        "FORMA\nFARMACÉUTICA",
        "LOTE",
        "FECHA DE\nVENCIMIENTO",
        "REGISTRO SANITARIO",
        "LABORATORIO",
        "CANTIDAD",
        "CAUSA DE\nDEVOLUCIÓN",
    ]
    data = [[Paragraph(h.replace("\n", "<br/>"), header_cell) for h in headers]]

    max_rows = 11
    for i in range(max_rows):
        dev = devoluciones[i] if i < len(devoluciones) else None
        data.append([
            "",
            Paragraph(
                dev.producto.nombre if dev and getattr(dev, "producto", None) else "",
                regular7_left,
            ),
            Paragraph(dev.forma_farmaceutica if dev else "", regular7),
            Paragraph(dev.lote if dev else "", regular7),
            Paragraph(
                str(dev.fecha_de_vencimiento)
                if dev and dev.fecha_de_vencimiento
                else "",
                regular7,
            ),
            Paragraph(dev.registrosanitario if dev else "", regular7),
            Paragraph(
                dev.proveedor.nombre if dev and getattr(dev, "proveedor", None) else "",
                regular7_left,
            ),
            Paragraph(
                str(dev.cantidad) if dev and dev.cantidad is not None else "", regular7
            ),
            Paragraph(str(dev.causa) if dev and dev.causa else "", regular7_left),
        ])

    col_widths = [
        2.2 * cm,
        5.6 * cm,
        2.4 * cm,
        1.8 * cm,
        2.2 * cm,
        2.6 * cm,
        3.0 * cm,
        1.8 * cm,
        4.74 * cm,
    ]

    row_heights = [0.9 * cm] + [0.75 * cm] * max_rows

    tabla = Table(
        data,
        colWidths=col_widths,
        rowHeights=row_heights,
        repeatRows=1,
        hAlign="CENTER",
    )
    tabla.setStyle(
        TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F2F2F2")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ])
    )
    elements.append(tabla)
    elements.append(Spacer(1, 10))

    # ---------- PIE DE PÁGINA ----------
    quien_recibe = (
        primer_item.quien_recibe
        if primer_item and getattr(primer_item, "quien_recibe", None)
        else prov_nombre
    )
    quien_entrega = (
        primer_item.quien_entrega
        if primer_item and getattr(primer_item, "quien_entrega", None)
        else ""
    )

    if primer_item and getattr(primer_item, "numero_de_formato", None):
        num_formato = str(primer_item.numero_de_formato).zfill(3)
    elif primer_item and getattr(primer_item, "id", None):
        num_formato = str(primer_item.id).zfill(3)
    else:
        num_formato = "001"

    footer_data = [
        [
            Paragraph("QUIEN RECIBE (PROVEEDOR)", label_style),
            "",
            Paragraph("QUIEN ENTREGA", label_style),
            "",
            Paragraph(f"<b>{num_formato}</b>", big_number),
        ],
        [
            Paragraph("NOMBRE:", label_style),
            Paragraph(quien_recibe.upper(), value_style),
            Paragraph("NOMBRE:", label_style),
            Paragraph(quien_entrega.upper(), value_style),
            "",
        ],
        [
            Paragraph("FECHA:", label_style),
            Paragraph(fecha_registro, value_style),
            Paragraph("FECHA:", label_style),
            Paragraph(fecha_registro, value_style),
            "",
        ],
    ]

    footer_table = Table(
        footer_data,
        colWidths=[2.2 * cm, 8.6 * cm, 2.2 * cm, 8.6 * cm, 4.74 * cm],
        rowHeights=[0.6 * cm, 0.6 * cm, 0.6 * cm],
        hAlign="CENTER",
    )

    footer_table.setStyle(
        TableStyle([
            ("SPAN", (0, 0), (1, 0)),
            ("SPAN", (2, 0), (3, 0)),
            ("SPAN", (4, 0), (4, 2)),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ])
    )

    elements.append(footer_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer