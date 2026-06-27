# ruff: noqa
# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.adk.tools import ToolContext
from google.genai import types

import os
import google.auth

_, project_id = google.auth.default()
os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"

# --- Product catalog ---
CATALOGO = {
    "laptop-01": {
        "id": "laptop-01",
        "nombre": 'UltraBook 14" 16GB',
        "categoria": "laptops",
        "precio": 980.0,
        "stock": 12,
        "imagen": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80",
    },
    "laptop-02": {
        "id": "laptop-02",
        "nombre": 'ProBook 15" 32GB',
        "categoria": "laptops",
        "precio": 1450.0,
        "stock": 5,
        "imagen": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80",
    },
    "mouse-01": {
        "id": "mouse-01",
        "nombre": "Mouse inalámbrico ErgoPro",
        "categoria": "accesorios",
        "precio": 35.0,
        "stock": 40,
        "imagen": "https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&q=80",
    },
    "monitor-01": {
        "id": "monitor-01",
        "nombre": 'Monitor 27" 4K',
        "categoria": "monitores",
        "precio": 320.0,
        "stock": 8,
        "imagen": "https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400&q=80",
    },
    "teclado-01": {
        "id": "teclado-01",
        "nombre": "Teclado mecánico TechZone",
        "categoria": "accesorios",
        "precio": 60.0,
        "stock": 25,
        "imagen": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80",
    },
}

PEDIDOS = []


# --- Tools ---
def buscar_productos(query: str) -> dict:
    """Busca productos en el catálogo de TechZone por nombre o categoría.

    Args:
        query: texto de búsqueda (ej. "laptop", "mouse", "accesorios").

    Returns:
        Diccionario con la lista de productos encontrados.
    """
    q = query.lower()
    resultados = [
        p for p in CATALOGO.values()
        if q in p["nombre"].lower() or q in p["categoria"].lower()
    ]
    return {"status": "success", "productos": resultados}


def agregar_al_carrito(producto_id: str, cantidad: int, tool_context: ToolContext) -> dict:
    """Agrega un producto al carrito de la sesión actual.

    Args:
        producto_id: id del producto a agregar (ej. "laptop-01").
        cantidad: cantidad de unidades a agregar.
        tool_context: inyectado automáticamente por ADK.

    Returns:
        Diccionario con el estado de la operación y el carrito actualizado.
    """
    producto = CATALOGO.get(producto_id)
    if not producto:
        return {"status": "error", "mensaje": f"No existe el producto {producto_id}."}
    if producto["stock"] < cantidad:
        return {"status": "error", "mensaje": f"Solo hay {producto['stock']} unidades de {producto['nombre']}."}

    carrito = tool_context.state.get("carrito", [])
    carrito.append({
        "producto_id": producto_id,
        "nombre": producto["nombre"],
        "cantidad": cantidad,
        "precio_unitario": producto["precio"],
    })
    tool_context.state["carrito"] = carrito
    return {"status": "success", "carrito": carrito}


def ver_carrito(tool_context: ToolContext) -> dict:
    """Muestra el contenido actual del carrito y el total a pagar.

    Args:
        tool_context: inyectado automáticamente por ADK.

    Returns:
        Diccionario con los items del carrito y el total.
    """
    carrito = tool_context.state.get("carrito", [])
    total = sum(i["cantidad"] * i["precio_unitario"] for i in carrito)
    return {"status": "success", "carrito": carrito, "total": total}


def confirmar_pedido(nombre_cliente: str, tool_context: ToolContext) -> dict:
    """Cierra la venta: descuenta stock, crea el pedido y vacía el carrito.

    Args:
        nombre_cliente: nombre del cliente para asociar al pedido.
        tool_context: inyectado automáticamente por ADK.

    Returns:
        Diccionario con el pedido creado.
    """
    carrito = tool_context.state.get("carrito", [])
    if not carrito:
        return {"status": "error", "mensaje": "El carrito está vacío."}

    for item in carrito:
        CATALOGO[item["producto_id"]]["stock"] -= item["cantidad"]

    total = sum(i["cantidad"] * i["precio_unitario"] for i in carrito)
    pedido = {
        "numero_orden": len(PEDIDOS) + 1,
        "cliente": nombre_cliente,
        "items": carrito,
        "total": total,
    }
    PEDIDOS.append(pedido)
    tool_context.state["carrito"] = []
    return {"status": "success", "pedido": pedido}


# --- Sub-agent: discount specialist ---
agente_descuentos = Agent(
    name="agente_descuentos",
    model=Gemini(
        model="gemini-flash-latest",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    description=(
        "Especialista en objeciones de precio. Úsalo cuando el cliente diga "
        "que algo está caro, dude del precio, o pida un descuento."
    ),
    instruction="""
Eres el especialista en retención de TechZone. Te activan cuando un cliente
objeta el precio de un producto.

Reglas:
- Puedes ofrecer máximo 10% de descuento, y solo sobre UN producto del carrito.
- Justifica el descuento con un beneficio real (envío gratis, garantía extendida).
- Si el cliente acepta, informa el nuevo precio y devuelve el control al agente principal.
- Nunca prometas algo fuera de esta política.
""",
)

# --- Root agent ---
root_agent = Agent(
    name="agente_ventas_techzone",
    model=Gemini(
        model="gemini-flash-latest",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    description="Agente de ventas de la tienda de tecnología TechZone.",
    instruction="""
Eres "Tecno", el asistente de ventas de TechZone.

Flujo esperado:
1. Entiende qué necesita el cliente y usa `buscar_productos` para mostrar opciones reales.
   Siempre muestra las imágenes de los productos usando Markdown (ej. ![Nombre](url)).
2. Cuando el cliente decida, usa `agregar_al_carrito`.
3. Usa `ver_carrito` para confirmar contenido y total antes de cerrar.
4. Si el cliente objeta el precio, transfiere la conversación a `agente_descuentos`.
5. Cuando el cliente confirme, pide su nombre y usa `confirmar_pedido`.

Nunca inventes productos, precios ni stock: todo viene de las herramientas.
""",
    tools=[buscar_productos, agregar_al_carrito, ver_carrito, confirmar_pedido],
    sub_agents=[agente_descuentos],
)

app = App(
    root_agent=root_agent,
    name="app",
)
