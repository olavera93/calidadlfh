import io
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side


def generar_excel_devolucion(devoluciones: list) -> io.BytesIO:
    wb = Workbook()
    ws = wb.active
    ws.title = "FORMATO DEVOLUCIONES"
    ws.views.sheetView[0].showGridLines = True

    # Estilos
    font_bold = Font(name="Arial", size=9, bold=True)
    font_regular = Font(name="Arial", size=9)
    font_large_bold = Font(name="Arial", size=20, bold=True)
    center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align = Alignment(horizontal="left", vertical="center")
    
    thin_border = Border(
        left=Side(style="thin"),
        right=Side(style="thin"),
        top=Side(style="thin"),
        bottom=Side(style="thin"),
    )
    gray_fill = PatternFill(start_color="F2F2F2", end_color="F2F2F2", fill_type="solid")

    # Anchos de columna
    col_widths = {"A": 12, "B": 35, "C": 18, "D": 12, "E": 14, "F": 18, "G": 20, "H": 10, "I": 25}
    for col, width in col_widths.items():
        ws.column_dimensions[col].width = width

    primer_item = devoluciones[0] if devoluciones else None
    
    # Datos de cabecera
    fecha_registro = ""
    if primer_item and hasattr(primer_item, "fecha_creacion") and primer_item.fecha_creacion:
        fecha_registro = str(primer_item.fecha_creacion.date()) if hasattr(primer_item.fecha_creacion, "date") else str(primer_item.fecha_creacion)

    prov_nombre = primer_item.proveedor.nombre if primer_item and getattr(primer_item, "proveedor", None) else ""
    obs_general = primer_item.observaciones if primer_item and getattr(primer_item, "observaciones", None) else ""

    # Cabecera superior izquierda
    ws["A1"] = f"FECHA: {fecha_registro}"
    ws["A1"].font = font_bold

    ws["A2"] = f"PROVEEDOR: {prov_nombre.upper()}"
    ws["A2"].font = font_bold

    ws.merge_cells("A3:G3")
    ws["A3"] = f"OBSERVACIONES: {obs_general.upper()}"
    ws["A3"].font = font_bold

    
    

    # Encabezados de la grilla principal
    headers = [
        ("A4", "N° FACTURA"),
        ("B4", "DESCRIPCIÓN DEL PRODUCTO FARMACÉUTICO"),
        ("C4", "FORMA FARMACÉUTICA"),
        ("D4", "LOTE"),
        ("E4", "FECHA DE VENCIMIENTO"),
        ("F4", "REGISTRO SANITARIO"),
        ("G4", "LABORATORIO"),
        ("H4", "CANTIDAD"),
        ("I4", "CAUSA DE DEVOLUCIÓN"),
    ]

    for cell_ref, text in headers:
        cell = ws[cell_ref]
        cell.value = text
        cell.font = font_bold
        cell.fill = gray_fill
        cell.alignment = center_align

    # Filas de datos
    start_row = 5
    max_rows = 11

    for i in range(max_rows):
        current_row = start_row + i
        dev = devoluciones[i] if i < len(devoluciones) else None

        ws[f"A{current_row}"] = ""
        ws[f"B{current_row}"] = dev.producto.nombre if dev and getattr(dev, "producto", None) else ""
        ws[f"C{current_row}"] = dev.forma_farmaceutica if dev else ""
        ws[f"D{current_row}"] = dev.lote if dev else ""
        ws[f"E{current_row}"] = str(dev.fecha_de_vencimiento) if dev and dev.fecha_de_vencimiento else ""
        ws[f"F{current_row}"] = dev.registrosanitario if dev else ""
        ws[f"G{current_row}"] = dev.proveedor.nombre if dev and getattr(dev, "proveedor", None) else ""
        ws[f"H{current_row}"] = dev.cantidad if dev else ""
        ws[f"I{current_row}"] = dev.causa if dev else ""

        for col in ["A", "B", "C", "D", "E", "F", "G", "H", "I"]:
            c = ws[f"{col}{current_row}"]
            c.font = font_regular
            c.alignment = center_align if col not in ["B", "G", "I"] else left_align

    # Pie de página / Firmas
    foot_start = 17
    ws.merge_cells(f"A{foot_start}:D{foot_start}")
    ws[f"A{foot_start}"] = "QUIEN RECIBE (PROVEEDOR)"
    ws[f"A{foot_start}"].font = font_bold

    quien_recibe = primer_item.quien_recibe if primer_item and primer_item.quien_recibe else prov_nombre
    ws[f"A{foot_start+1}"] = f"NOMBRE: {quien_recibe.upper()}"
    ws[f"A{foot_start+2}"] = f"FECHA: {fecha_registro}"
    ws[f"A{foot_start+1}"].font = font_bold
    ws[f"A{foot_start+2}"].font = font_bold

    quien_entrega = primer_item.quien_entrega if primer_item and primer_item.quien_entrega else ""
    ws[f"E{foot_start+1}"] = f"NOMBRE: {quien_entrega.upper()}"
    ws[f"E{foot_start+2}"] = f"FECHA: {fecha_registro}"
    ws[f"E{foot_start+1}"].font = font_bold
    ws[f"E{foot_start+2}"].font = font_bold

    # CORRECCIÓN AQUÍ: Uso de zfill(3) en lugar de padStart(3, '0')
    if primer_item and getattr(primer_item, "numero_de_formato", None):
        num_formato = str(primer_item.numero_de_formato).zfill(3)
    elif primer_item and getattr(primer_item, "id", None):
        num_formato = str(primer_item.id).zfill(3)
    else:
        num_formato = "001"
    
    ws.merge_cells(f"H{foot_start}:I{foot_start+2}")
    ws[f"H{foot_start}"] = num_formato
    ws[f"H{foot_start}"].font = font_large_bold
    ws[f"H{foot_start}"].alignment = center_align

    # Bordes
    for row in ws.iter_rows(min_row=1, max_row=foot_start + 2, min_col=1, max_col=9):
        for cell in row:
            cell.border = thin_border

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output