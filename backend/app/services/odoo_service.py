"""
Servicio de integración con Odoo via JSON-RPC.
Las llamadas reales a Odoo están preparadas pero desactivadas hasta que
se configure la conexión desde el panel de administración.
"""
from datetime import date as _date
from typing import Optional

import httpx

from app.schemas.odoo import RecepcionItem, VencimientoItem


class OdooNotConfiguredError(Exception):
    pass


class OdooConnectionError(Exception):
    pass


# ── Primitiva JSON-RPC ─────────────────────────────────────────────────────────

def _call_kw(url: str, db: str, uid: int, password: str,
             model: str, method: str, args: list, kwargs: dict) -> list:
    payload = {
        "jsonrpc": "2.0",
        "method": "call",
        "id": 1,
        "params": {
            "service": "object",
            "method": "execute_kw",
            "args": [db, uid, password, model, method, args, kwargs],
        },
    }
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(f"{url}/jsonrpc", json=payload)
            resp.raise_for_status()
            data = resp.json()
    except httpx.RequestError as e:
        raise OdooConnectionError(f"No se pudo conectar a Odoo: {e}") from e

    if "error" in data:
        msg = data["error"].get("data", {}).get("message", str(data["error"]))
        raise OdooConnectionError(f"Error Odoo: {msg}")
    return data.get("result", [])


# ── Autenticación ──────────────────────────────────────────────────────────────

def authenticate(url: str, db: str, username: str, password: str) -> int:
    payload = {
        "jsonrpc": "2.0",
        "method": "call",
        "id": 1,
        "params": {"service": "common", "method": "authenticate",
                   "args": [db, username, password, {}]},
    }
    try:
        with httpx.Client(timeout=15) as client:
            resp = client.post(f"{url}/jsonrpc", json=payload)
            resp.raise_for_status()
            data = resp.json()
    except httpx.RequestError as e:
        raise OdooConnectionError(f"No se pudo conectar a Odoo: {e}") from e

    uid = data.get("result")
    if not uid:
        raise OdooConnectionError("Credenciales incorrectas o base de datos no encontrada")
    return uid


# ── Helpers de recepciones ─────────────────────────────────────────────────────

def _fetch_pickings(url: str, db: str, uid: int, password: str,
                    picking_ids: list[int]) -> dict:
    if not picking_ids:
        return {}
    pickings = {}
    for p in _call_kw(url, db, uid, password, "stock.picking", "search_read",
                      [[["id", "in", picking_ids]]],
                      {"fields": ["id", "partner_id", "origin", "purchase_id"], "limit": 0}):
        pickings[p["id"]] = p
    return pickings


def _resolve_picking_orders(url: str, db: str, uid: int, password: str,
                             pickings: dict,
                             direct_po: dict | None = None,
                             origin_po: dict | None = None) -> tuple[dict, dict]:
    if direct_po is None:
        direct_po = {}
    if origin_po is None:
        origin_po = {}

    origins_without_po = []
    for pid, p in pickings.items():
        if pid in direct_po:
            continue
        if isinstance(p.get("purchase_id"), list):
            direct_po[pid] = p["purchase_id"][0]
        elif p.get("origin") and p["origin"] not in origin_po:
            origins_without_po.append(p["origin"])

    if origins_without_po:
        for po in _call_kw(url, db, uid, password, "purchase.order", "search_read",
                           [[["name", "in", list(set(origins_without_po))]]],
                           {"fields": ["id", "name"], "limit": 0}):
            origin_po[po["name"]] = po["id"]

    return direct_po, origin_po


def _resolve_po_id_for_picking(pid: int | None, pickings: dict,
                                direct_po: dict, origin_po: dict) -> int | None:
    if pid is None:
        return None
    if pid in direct_po:
        return direct_po[pid]
    origin = (pickings.get(pid) or {}).get("origin", "")
    return origin_po.get(origin)


def _resolve_invoices(url: str, db: str, uid: int, password: str,
                      po_ids: list[int]) -> tuple[dict, dict]:
    """Devuelve (po_invoices, po_partners). Filtra notas crédito/reversiones."""
    po_invoices: dict = {}
    po_partners: dict = {}
    if not po_ids:
        return po_invoices, po_partners

    po_invoice_ids: dict = {}
    all_invoice_ids: list = []
    for po in _call_kw(url, db, uid, password, "purchase.order", "search_read",
                       [[["id", "in", po_ids]]],
                       {"fields": ["id", "invoice_ids", "partner_id"], "limit": 0}):
        ids = po.get("invoice_ids") or []
        po_invoice_ids[po["id"]] = ids
        all_invoice_ids.extend(ids)
        if isinstance(po.get("partner_id"), list):
            po_partners[po["id"]] = po["partner_id"]

    if all_invoice_ids:
        invoices: dict = {}
        for inv in _call_kw(url, db, uid, password, "account.move", "search_read",
                            [[["id", "in", list(set(all_invoice_ids))]]],
                            {"fields": ["id", "name", "ref", "partner_id", "move_type"], "limit": 0}):
            invoices[inv["id"]] = inv

        tipos_reversion = {"in_refund", "out_refund"}
        for po_id, iids in po_invoice_ids.items():
            inv_list = [invoices[iid] for iid in iids if iid in invoices]
            if not inv_list:
                continue
            # Priorizar facturas originales sobre notas crédito/reversiones
            facturas = [i for i in inv_list if i.get("move_type") not in tipos_reversion] or inv_list
            first = facturas[0]
            po_invoices[po_id] = {
                "partner": first.get("partner_id") if isinstance(first.get("partner_id"), list) else None,
                "ref":     first.get("ref") or "",
                "name":    ", ".join(i.get("name", "") for i in facturas if i.get("name")),
            }

    return po_invoices, po_partners


# ── Recepciones ────────────────────────────────────────────────────────────────

def get_recepciones(
    url: str, db: str, uid: int, password: str,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    ubicacion_origen: Optional[str] = None,
    ubicacion_destino: Optional[str] = None,
    numero_movimiento: Optional[str] = None,
) -> list[RecepcionItem]:
    domain: list = [["state", "=", "done"]]
    if fecha_inicio:
        domain.append(["date", ">=", f"{fecha_inicio} 00:00:00"])
    if fecha_fin:
        domain.append(["date", "<=", f"{fecha_fin} 23:59:59"])
    if ubicacion_origen:
        domain.append(["location_id.complete_name", "ilike", ubicacion_origen])
    if ubicacion_destino:
        domain.append(["location_dest_id.complete_name", "ilike", ubicacion_destino])
    if numero_movimiento:
        domain.append(["picking_id.name", "ilike", numero_movimiento])

    lines = _call_kw(url, db, uid, password, "stock.move.line", "search_read",
                     [domain],
                     {"fields": ["date", "location_id", "location_dest_id",
                                 "picking_id", "product_id", "lot_id", "qty_done"],
                      "order": "date desc", "limit": 4000})
    if not lines:
        return []

    # ── Pickings propios ───────────────────────────────────────────────────────
    picking_ids = list({ml["picking_id"][0] for ml in lines
                        if isinstance(ml.get("picking_id"), list)})
    pickings = _fetch_pickings(url, db, uid, password, picking_ids)
    direct_po, origin_po = _resolve_picking_orders(url, db, uid, password, pickings)

    # ── Rastreo por lote para traslados internos sin OC ───────────────────────
    # Para cada línea sin OC conocida, buscamos la recepción original (desde
    # ubicación de proveedor) del mismo producto+lote y usamos su orden/factura.
    trace_keys: set[str] = set()
    for ml in lines:
        pid = ml["picking_id"][0] if isinstance(ml.get("picking_id"), list) else None
        if _resolve_po_id_for_picking(pid, pickings, direct_po, origin_po) is not None:
            continue
        product_id = ml["product_id"][0] if isinstance(ml.get("product_id"), list) else None
        lot_id     = ml["lot_id"][0]     if isinstance(ml.get("lot_id"), list)     else None
        if product_id and lot_id:
            trace_keys.add(f"{product_id}|{lot_id}")

    trace_candidates: dict[str, list[dict]] = {}
    if trace_keys:
        pairs       = [k.split("|") for k in trace_keys]
        product_ids = list({int(p[0]) for p in pairs})
        lot_ids2    = list({int(p[1]) for p in pairs})

        receipts = _call_kw(url, db, uid, password, "stock.move.line", "search_read",
                            [[["product_id", "in", product_ids],
                              ["lot_id", "in", lot_ids2],
                              ["location_id.usage", "=", "supplier"],
                              ["state", "=", "done"]]],
                            {"fields": ["date", "product_id", "lot_id", "picking_id"],
                             "order": "date desc", "limit": 0})

        for r in receipts:
            r_pid  = r["picking_id"][0] if isinstance(r.get("picking_id"), list) else None
            r_prod = r["product_id"][0] if isinstance(r.get("product_id"), list) else None
            r_lot  = r["lot_id"][0]     if isinstance(r.get("lot_id"), list)     else None
            if not (r_pid and r_prod and r_lot):
                continue
            key = f"{r_prod}|{r_lot}"
            trace_candidates.setdefault(key, []).append({"date": r["date"], "pid": r_pid})

    # Cargar los pickings nuevos descubiertos por el rastreo
    trace_picking_ids = [c["pid"] for cands in trace_candidates.values() for c in cands]
    new_picking_ids   = list(set(trace_picking_ids) - set(pickings.keys()))
    if new_picking_ids:
        pickings.update(_fetch_pickings(url, db, uid, password, new_picking_ids))
        direct_po, origin_po = _resolve_picking_orders(
            url, db, uid, password, pickings, direct_po, origin_po)

    # Elegir candidato más cercano por fecha (anterior o igual al movimiento)
    traced_pid: dict[int, int] = {}
    for i, ml in enumerate(lines):
        pid = ml["picking_id"][0] if isinstance(ml.get("picking_id"), list) else None
        if _resolve_po_id_for_picking(pid, pickings, direct_po, origin_po) is not None:
            continue
        product_id = ml["product_id"][0] if isinstance(ml.get("product_id"), list) else None
        lot_id     = ml["lot_id"][0]     if isinstance(ml.get("lot_id"), list)     else None
        if not (product_id and lot_id):
            continue
        candidates = trace_candidates.get(f"{product_id}|{lot_id}", [])
        if not candidates:
            continue
        ml_date = ml.get("date", "")
        chosen = next((c for c in candidates if c["date"] <= ml_date), None)
        traced_pid[i] = (chosen or candidates[0])["pid"]

    # ── Facturas y partners ────────────────────────────────────────────────────
    all_po_ids: list[int] = []
    for pid in pickings:
        po_id = _resolve_po_id_for_picking(pid, pickings, direct_po, origin_po)
        if po_id:
            all_po_ids.append(po_id)
    po_invoices, po_partners = _resolve_invoices(
        url, db, uid, password, list(set(all_po_ids)))

    # ── Lotes / fechas de vencimiento ─────────────────────────────────────────
    lot_ids = list({ml["lot_id"][0] for ml in lines if isinstance(ml.get("lot_id"), list)})
    lots: dict = {}
    if lot_ids:
        try:
            for lot in _call_kw(url, db, uid, password, "stock.lot", "search_read",
                                [[["id", "in", lot_ids]]],
                                {"fields": ["id", "expiration_date"], "limit": 0}):
                lots[lot["id"]] = lot
        except Exception:
            pass

    # ── Construcción del resultado ─────────────────────────────────────────────
    result = []
    for i, ml in enumerate(lines):
        pid      = ml["picking_id"][0] if isinstance(ml.get("picking_id"), list) else None
        po_id    = _resolve_po_id_for_picking(pid, pickings, direct_po, origin_po)
        inferida = False

        if po_id is None and i in traced_pid:
            pid      = traced_pid[i]
            po_id    = _resolve_po_id_for_picking(pid, pickings, direct_po, origin_po)
            inferida = True

        picking = pickings.get(pid) or {} if pid else {}
        lot_id  = ml["lot_id"][0] if isinstance(ml.get("lot_id"), list) else None
        lot     = lots.get(lot_id) or {} if lot_id else {}
        po_inv  = po_invoices.get(po_id) if po_id else None

        if po_inv and po_inv.get("partner"):
            partner = po_inv["partner"]
        elif po_id and po_id in po_partners:
            partner = po_partners[po_id]
        elif isinstance(picking.get("partner_id"), list):
            partner = picking["partner_id"]
        else:
            partner = None

        result.append(RecepcionItem(
            fecha=         (ml.get("date") or "")[:10],
            origen=        ml["location_id"][1]      if isinstance(ml.get("location_id"), list)      else "",
            destino=       ml["location_dest_id"][1] if isinstance(ml.get("location_dest_id"), list) else "",
            proveedor=     partner[1] if partner else "",
            orden=         picking.get("origin") or "Traslado interno",
            factura=       po_inv["ref"] if po_inv else "",
            orden_inferida=inferida,
            producto=      ml["product_id"][1] if isinstance(ml.get("product_id"), list) else "",
            lote=          ml["lot_id"][1]      if isinstance(ml.get("lot_id"), list)      else "",
            vencimiento=   (lot.get("expiration_date") or "")[:10],
            cantidad=      ml.get("qty_done", 0),
        ))
    return result


# ── Vencimientos ───────────────────────────────────────────────────────────────

def get_vencimientos(
    url: str, db: str, uid: int, password: str,
    fecha_hasta: str,
    fecha_desde: Optional[str] = None,
) -> list[VencimientoItem]:
    hoy = _date.today().isoformat()
    if not fecha_desde:
        fecha_desde = hoy

    lots = _call_kw(url, db, uid, password, "stock.lot", "search_read",
                    [[["expiration_date", "!=", False],
                      ["expiration_date", ">=", f"{fecha_desde} 00:00:00"],
                      ["expiration_date", "<=", f"{fecha_hasta} 23:59:59"]]],
                    {"fields": ["id", "name", "product_id", "expiration_date"], "limit": 0})
    if not lots:
        return []

    lot_map = {lot["id"]: lot for lot in lots}
    quants = _call_kw(url, db, uid, password, "stock.quant", "search_read",
                      [[["lot_id", "in", list(lot_map.keys())],
                        ["quantity", ">", 0],
                        ["location_id.usage", "=", "internal"]]],
                      {"fields": ["lot_id", "product_id", "location_id", "quantity"], "limit": 0})

    today = _date.today()
    result = []
    for q in quants:
        lot_id = q["lot_id"][0] if isinstance(q.get("lot_id"), list) else None
        lot    = lot_map.get(lot_id)
        if not lot:
            continue
        exp  = (lot.get("expiration_date") or "")[:10]
        dias = (_date.fromisoformat(exp) - today).days if exp else None
        result.append(VencimientoItem(
            vencimiento=exp,
            dias=dias,
            producto=   lot["product_id"][1] if isinstance(lot.get("product_id"), list) else "",
            lote=       lot["name"],
            ubicacion=  q["location_id"][1]  if isinstance(q.get("location_id"), list)  else "",
            cantidad=   round(q.get("quantity", 0), 2),
        ))

    result.sort(key=lambda x: x.vencimiento)
    return result

import re
from sqlalchemy.orm import Session
from app.models.producto import Producto  # Modelo local[cite: 3]

def aplicar_correccion_productos_locales(items: list, db: Session) -> list:
    """
    Recorre los ítems de Odoo. Si un producto contiene '(copia)', extrae su código,
    busca en la DB local (solo lectura) y asigna el NOMBRE local manteniendo el código.
    """
    if not items:
        return items

    try:
        # 1. Filtrar ítems que contienen '(copia)'
        items_con_copia = [
            item for item in items 
            if item.producto and "(copia)" in item.producto.lower()
        ]

        if not items_con_copia:
            return items

        # 2. Cargar productos locales en memoria[cite: 3]
        productos_locales = db.query(Producto.codigo, Producto.nombre).all()
        mapa_codigo = {p.codigo.strip(): p.nombre for p in productos_locales if p.codigo}
        mapa_nombre = {p.nombre.strip().lower(): p.nombre for p in productos_locales if p.nombre}

        # 3. Procesar y reemplazar preservando el CÓDIGO
        for item in items_con_copia:
            original = item.producto
            
            # Quitar '(copia)' u '(Copia)'
            limpio = re.sub(r'\s*\((?:copia|Copia)\)', '', original, flags=re.IGNORECASE).strip()
            
            # Extraer si viene en formato: [2202015] Nombre Producto
            match = re.match(r'^\[(.*?)\]\s*(.*)$', limpio)
            
            if match:
                cod_extraido = match.group(1).strip()
                nom_extraido = match.group(2).strip()
                
                nombre_oficial = None
                # Buscar por código local primero[cite: 3]
                if cod_extraido in mapa_codigo:
                    nombre_oficial = mapa_codigo[cod_extraido]
                # Buscar por nombre en minúsculas como respaldo
                elif nom_extraido.lower() in mapa_nombre:
                    nombre_oficial = mapa_nombre[nom_extraido.lower()]

                if nombre_oficial:
                    # MANTIENE EL CÓDIGO PARA QUE EL BUSCADOR DE REACT PUEDA ENCONTRARLO
                    item.producto = f"[{cod_extraido}] {nombre_oficial}"
                else:
                    item.producto = limpio
            else:
                # Si no trae corchetes, intentar coincidencia completa
                if limpio in mapa_codigo:
                    item.producto = f"[{limpio}] {mapa_codigo[limpio]}"
                elif limpio.lower() in mapa_nombre:
                    item.producto = mapa_nombre[limpio.lower()]
                else:
                    item.producto = limpio

    except Exception as e:
        print(f"[ERROR Odoo-Local Mapping]: {e}")

    return items
