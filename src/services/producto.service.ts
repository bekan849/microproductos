import { supabaseAdmin } from "../lib/supabase";

export type ProductoEstado = "ACTIVO" | "INACTIVO";

export type ProductoCreate = {
  nombre: string;
  descripcion?: string | null;
  idcategoria: string;
  idmarca: string;
  urlimagen?: string | null;
  precioventa?: number;
  estado?: ProductoEstado;
};

export type ProductoUpdate = {
  nombre?: string;
  descripcion?: string | null;
  idcategoria?: string;
  idmarca?: string;
  urlimagen?: string | null;
  precioventa?: number;
  estado?: ProductoEstado;
};

export type ProductoListQuery = {
  q?: string;
  idcategoria?: string;
  idmarca?: string;
  estado?: ProductoEstado;
  soloConStock?: boolean | string;
  page?: number;
  limit?: number;
  orderBy?: "creado_en" | "nombre" | "stock" | "precioventa";
  order?: "asc" | "desc";
};

function normalizeName(name: string) {
  return String(name ?? "")
    .trim()
    .toUpperCase();
}

function normalizeText(value?: string | null) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function normalizeForCode(text: string) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/gi, "")
    .trim()
    .toUpperCase();
}

function buildCodePrefix(nombreProducto: string, nombreMarca: string) {
  const nombre = normalizeForCode(nombreProducto).replace(/\s+/g, "");
  const marca = normalizeForCode(nombreMarca).replace(/\s+/g, "");

  const parteProducto = nombre.slice(0, 2).padEnd(2, "X");
  const parteMarca = marca.slice(0, 1).padEnd(1, "X");

  return `${parteProducto}${parteMarca}`;
}

function parseUniqueMessage(errorMessage: string) {
  if (errorMessage.toLowerCase().includes("duplicate")) {
    return "Registro duplicado: verifica nombre y/o código del producto.";
  }
  return errorMessage;
}

async function obtenerMarcaPorId(idmarca: string) {
  const { data, error } = await supabaseAdmin
    .from("marcas")
    .select("idmarca, nombre")
    .eq("idmarca", idmarca)
    .single();

  if (error || !data) {
    throw new Error("No se encontró la marca del producto");
  }

  return data;
}

async function generarCodigoProducto(
  nombreProducto: string,
  idmarca: string
): Promise<string> {
  const marca = await obtenerMarcaPorId(idmarca);
  const prefix = buildCodePrefix(nombreProducto, marca.nombre);

  const { data, error } = await supabaseAdmin
    .from("productos")
    .select("codigoprod")
    .ilike("codigoprod", `${prefix}-%`);

  if (error) throw new Error(error.message);

  let maxCorrelativo = 0;

  for (const item of data ?? []) {
    const codigo = String(item.codigoprod ?? "");
    const [, correlativoRaw] = codigo.split("-");
    const correlativo = Number(correlativoRaw ?? 0);

    if (Number.isFinite(correlativo) && correlativo > maxCorrelativo) {
      maxCorrelativo = correlativo;
    }
  }

  const siguiente = String(maxCorrelativo + 1).padStart(5, "0");
  return `${prefix}-${siguiente}`;
}
export async function sincronizarEstadoProductoPorStock(idproducto: string) {
  const { data: producto, error } = await supabaseAdmin
    .from("productos")
    .select("idproducto, stock, estado")
    .eq("idproducto", idproducto)
    .single();

  if (error || !producto) {
    throw new Error(`No se encontró el producto ${idproducto}`);
  }

  const stock = Number(producto.stock ?? 0);
  const nuevoEstado = stock > 0 ? "ACTIVO" : "INACTIVO";

  if (producto.estado === nuevoEstado) return producto;

  const { data, error: updateError } = await supabaseAdmin
    .from("productos")
    .update({ estado: nuevoEstado })
    .eq("idproducto", idproducto)
    .select("idproducto, stock, estado")
    .single();

  if (updateError) throw new Error(updateError.message);

  return data;
}

export async function listarProductos(query: ProductoListQuery) {
  const page = Math.max(1, Number(query.page ?? 1));
  const limitRaw = Number(query.limit ?? 20);
  const limit = Math.min(Math.max(limitRaw, 1), 200);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const orderByMap: Record<
    string,
    "creado_en" | "nombre" | "stock" | "precioventa"
  > = {
    creado_en: "creado_en",
    nombre: "nombre",
    stock: "stock",
    precioventa: "precioventa",
  };

  const orderBy = orderByMap[query.orderBy ?? "creado_en"] ?? "creado_en";
  const ascending = (query.order ?? "desc").toLowerCase() === "asc";

  let q = supabaseAdmin
    .from("productos")
    .select(
      `
      idproducto,
      codigoprod,
      nombre,
      descripcion,
      stock,
      urlimagen,
      precioventa,
      estado,
      creado_en,
      idcategoria,
      idmarca,
      categorias:categorias ( idcategoria, nombre ),
      marcas:marcas ( idmarca, nombre )
      `,
      { count: "exact" }
    )
    .order(orderBy, { ascending })
    .range(from, to);

  if (query.idcategoria) q = q.eq("idcategoria", query.idcategoria);
  if (query.idmarca) q = q.eq("idmarca", query.idmarca);
  if (query.estado) q = q.eq("estado", query.estado);

  if (String(query.soloConStock) === "true") {
    q = q.gt("stock", 0);
  }

  if (query.q && query.q.trim()) {
    const term = query.q.trim();
    q = q.or(
      `nombre.ilike.%${term}%,codigoprod.ilike.%${term}%,descripcion.ilike.%${term}%`
    );
  }

  const { data, error, count } = await q;

  if (error) throw new Error(error.message);

  return {
    page,
    limit,
    total: count ?? 0,
    data: data ?? [],
  };
}

export async function obtenerProductoPorId(idproducto: string) {
  const { data, error } = await supabaseAdmin
    .from("productos")
    .select(
      `
      idproducto,
      codigoprod,
      nombre,
      descripcion,
      idcategoria,
      idmarca,
      stock,
      urlimagen,
      precioventa,
      estado,
      creado_en,
      categorias:categorias ( idcategoria, nombre ),
      marcas:marcas ( idmarca, nombre )
      `
    )
    .eq("idproducto", idproducto)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function crearProducto(payload: ProductoCreate) {
  const nombre = normalizeName(payload.nombre);

  if (!nombre) throw new Error("nombre es obligatorio");
  if (!payload.idcategoria) throw new Error("idcategoria es obligatorio");
  if (!payload.idmarca) throw new Error("idmarca es obligatorio");

  const precioventa = Number(payload.precioventa ?? 0);
  if (!Number.isFinite(precioventa) || precioventa < 0) {
    throw new Error("precioventa inválido");
  }

  if (
    payload.estado &&
    payload.estado !== "ACTIVO" &&
    payload.estado !== "INACTIVO"
  ) {
    throw new Error("estado inválido (ACTIVO | INACTIVO)");
  }

  const codigoprod = await generarCodigoProducto(nombre, payload.idmarca);

  const insertRow = {
    codigoprod,
    nombre,
    descripcion: normalizeText(payload.descripcion),
    idcategoria: payload.idcategoria,
    idmarca: payload.idmarca,
    stock: 0,
    urlimagen: normalizeText(payload.urlimagen),
    precioventa,
    estado: "INACTIVO",
  };

  const { data, error } = await supabaseAdmin
    .from("productos")
    .insert([insertRow])
    .select(
      `
      idproducto,
      codigoprod,
      nombre,
      descripcion,
      idcategoria,
      idmarca,
      stock,
      urlimagen,
      precioventa,
      estado,
      creado_en,
      categorias:categorias ( idcategoria, nombre ),
      marcas:marcas ( idmarca, nombre )
      `
    )
    .single();

  if (error) throw new Error(parseUniqueMessage(error.message));
  return data;
}

export async function actualizarProducto(
  idproducto: string,
  payload: ProductoUpdate
) {
  if (!idproducto) throw new Error("Falta idproducto");

  const update: Record<string, any> = {};

  if (payload.nombre !== undefined) {
    const nombre = normalizeName(payload.nombre);
    if (!nombre) throw new Error("nombre no puede quedar vacío");
    update.nombre = nombre;
  }

  if (payload.descripcion !== undefined) {
    update.descripcion = normalizeText(payload.descripcion);
  }

  if (payload.idcategoria !== undefined) {
    if (!payload.idcategoria) throw new Error("idcategoria inválido");
    update.idcategoria = payload.idcategoria;
  }

  if (payload.idmarca !== undefined) {
    if (!payload.idmarca) throw new Error("idmarca inválido");
    update.idmarca = payload.idmarca;
  }

  if (payload.urlimagen !== undefined) {
    update.urlimagen = normalizeText(payload.urlimagen);
  }

  if (payload.precioventa !== undefined) {
    const precioventa = Number(payload.precioventa);
    if (!Number.isFinite(precioventa) || precioventa < 0) {
      throw new Error("precioventa inválido");
    }
    update.precioventa = precioventa;
  }

  if (payload.estado !== undefined) {
    if (payload.estado !== "ACTIVO" && payload.estado !== "INACTIVO") {
      throw new Error("estado inválido (ACTIVO | INACTIVO)");
    }
    update.estado = payload.estado;
  }

  if (Object.keys(update).length === 0) {
    throw new Error("No hay campos para actualizar");
  }

  const { data, error } = await supabaseAdmin
    .from("productos")
    .update(update)
    .eq("idproducto", idproducto)
    .select(
      `
      idproducto,
      codigoprod,
      nombre,
      descripcion,
      idcategoria,
      idmarca,
      stock,
      urlimagen,
      precioventa,
      estado,
      creado_en,
      categorias:categorias ( idcategoria, nombre ),
      marcas:marcas ( idmarca, nombre )
      `
    )
    .single();

  if (error) throw new Error(parseUniqueMessage(error.message));
  return data;
}

export async function setEstadoProducto(
  idproducto: string,
  estado: ProductoEstado
) {
  if (estado !== "ACTIVO" && estado !== "INACTIVO") {
    throw new Error("estado inválido (ACTIVO | INACTIVO)");
  }

  const { data, error } = await supabaseAdmin
    .from("productos")
    .update({ estado })
    .eq("idproducto", idproducto)
    .select(
      `
      idproducto,
      codigoprod,
      nombre,
      descripcion,
      idcategoria,
      idmarca,
      stock,
      urlimagen,
      precioventa,
      estado,
      creado_en,
      categorias:categorias ( idcategoria, nombre ),
      marcas:marcas ( idmarca, nombre )
      `
    )
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function eliminarProducto(idproducto: string) {
  if (!idproducto) throw new Error("Falta idproducto");

  const { data, error } = await supabaseAdmin
    .from("productos")
    .delete()
    .eq("idproducto", idproducto)
    .select(
      `
      idproducto,
      codigoprod,
      nombre,
      descripcion,
      idcategoria,
      idmarca,
      stock,
      urlimagen,
      precioventa,
      estado,
      creado_en,
      categorias:categorias ( idcategoria, nombre ),
      marcas:marcas ( idmarca, nombre )
      `
    )
    .single();

  if (error) throw new Error(error.message);
  return data;
}
