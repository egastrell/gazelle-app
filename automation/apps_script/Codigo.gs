/**
 * Actualización automática de montos de referencia (Config) — Gazelle
 * + Registro automático de transferencias (diezmo y similares) en Tarjetas
 *
 * Corre DENTRO del Google Sheet (Apps Script vinculado), sin terminal,
 * sin gcloud, sin credenciales que guardar. El único paso manual es
 * autorizar una vez (ver README de esta carpeta) y correr
 * configurarTrigger() una sola vez para que quede en automático.
 */

var DRIVE_FOLDER_ID = '1AygsLwG30QaMfFNMuRXZVZNbN-_eANyf';
var CONFIG_SHEET_NAME = 'Config';
var TARJETAS_SHEET_NAME = 'Tarjetas';
var LOG_SHEET_NAME = 'Log_Automatizacion';
var PENDIENTES_SHEET_NAME = 'Pendientes_Confirmacion';
var PROCESADAS_SUBFOLDER = 'Procesadas';
var EMAIL_NOTIFICACIONES = 'efgastrell@gmail.com';

// Titulares cuyas facturas/transferencias NUNCA deben tocar Config ni Tarjetas.
var TITULARES_EXCLUIDOS = ['SEGOVIA MIRTA ELENA', 'GASTRELL ALFREDO EDUARDO'];

// clave en Config -> patrones (regex, case-insensitive) que identifican al proveedor
var PROVEEDORES = {
  swiss_medical: [/SWISS\s*MEDICAL/i],
  edenor_eduardo: [/EDENOR/i],
  gas_natural_eduardo: [/NATURGY/i, /GAS\s*NATURAL/i],
  internet_urunet: [/URUNET/i]
};

// Proveedores donde puede haber dos cuentas en el mismo lote (Eduardo/Mirta):
// se toma siempre la de mayor monto.
var PROVEEDORES_CON_PAR = ['edenor_eduardo', 'gas_natural_eduardo'];

// Beneficiarios de transferencias que se registran como gasto en Tarjetas
// (mismo criterio de "armado del nombre" que ya usa la app para Categoria/USUARIO).
var BENEFICIARIOS_TRANSFERENCIA = [
  {
    patrones: [
      /ASOCIACION\s*CIVIL\s*CENTRO\s*FAMILIA\s*Y\s*VIDA/i,
      /30[-.]?714829358|30[-.]?71482935[-.]?8/,
      /0000003100033712204323/
    ],
    comercio: 'Centro Familia y Vida (Diezmo)',
    categoria: 'Diezmo',
    subcategoria: 'Iglesia'
  }
];

var MESES_ES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
  agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
};

/**
 * Punto de entrada. Se corre sola por el trigger de tiempo una vez
 * configurada (ver configurarTrigger).
 */
function actualizarMontosReferencia() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  var tarjetasSheet = ss.getSheetByName(TARJETAS_SHEET_NAME);
  var logSheet = obtenerOCrearHoja_(ss, LOG_SHEET_NAME,
    ['Fecha', 'Proveedor/Categoría', 'Titular', 'Estado', 'Monto anterior', 'Monto nuevo', 'Variación', 'Fecha/Vencimiento', 'Archivo']);
  var pendientesSheet = obtenerOCrearHoja_(ss, PENDIENTES_SHEET_NAME,
    ['Fecha', 'Proveedor/Categoría', 'Monto', 'Fecha/Vencimiento', 'Archivo', 'Link']);

  var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var procesadasFolder = obtenerOCrearSubcarpeta_(folder, PROCESADAS_SUBFOLDER);

  var archivos = listarArchivosPendientes_(folder);
  if (archivos.length === 0) return;

  var hallazgosFacturas = [];
  var reporteTransferencias = [];

  for (var i = 0; i < archivos.length; i++) {
    var file = archivos[i];
    var texto;
    try {
      texto = extraerTextoArchivo_(file);
    } catch (e) {
      Logger.log('No se pudo leer ' + file.getName() + ': ' + e);
      continue;
    }

    if (esResumenTarjeta_(texto)) {
      moverAProcesadas_(file, procesadasFolder);
      continue; // resumen de tarjeta de crédito: puede mencionar un proveedor de pasada, no es su factura
    }

    var clave = identificarProveedor_(texto);
    if (clave) {
      var titular = identificarTitular_(texto);
      var monto = extraerMontoTotal_(texto);
      var vencimiento = extraerVencimiento_(texto);
      if (monto === null) {
        Logger.log('No se pudo extraer el monto de ' + file.getName());
        continue; // se deja en la carpeta para revisar a mano
      }
      hallazgosFacturas.push({ clave: clave, titular: titular, monto: monto, vencimiento: vencimiento, file: file });
      continue;
    }

    if (esOrdenTransferencia_(texto)) {
      var resultado = procesarTransferencia_(texto, file, tarjetasSheet, logSheet, pendientesSheet, procesadasFolder);
      if (resultado) reporteTransferencias.push(resultado);
      continue;
    }

    // No es factura de un proveedor monitoreado ni una transferencia: se ignora para siempre.
    moverAProcesadas_(file, procesadasFolder);
  }

  var reporteConfig = procesarFacturas_(hallazgosFacturas, configSheet, logSheet, pendientesSheet, procesadasFolder);

  if (reporteConfig.length > 0 || reporteTransferencias.length > 0) {
    enviarResumen_(reporteConfig, reporteTransferencias);
  }
}

/**
 * Agrupa las facturas encontradas por proveedor, resuelve el par Eduardo/Mirta
 * y actualiza (o deja pendiente de confirmación) cada fila de Config.
 */
function procesarFacturas_(hallazgos, configSheet, logSheet, pendientesSheet, procesadasFolder) {
  var porProveedor = {};
  hallazgos.forEach(function (h) {
    (porProveedor[h.clave] = porProveedor[h.clave] || []).push(h);
  });

  var reporteConfig = [];

  Object.keys(porProveedor).forEach(function (clave) {
    var items = porProveedor[clave];

    items.forEach(function (h) { moverAProcesadas_(h.file, procesadasFolder); });

    var elegido;
    if (PROVEEDORES_CON_PAR.indexOf(clave) !== -1 && items.length > 1) {
      elegido = items.slice().sort(function (a, b) { return b.monto - a.monto; })[0];
    } else {
      var noExcluidos = items.filter(function (h) { return TITULARES_EXCLUIDOS.indexOf(h.titular) === -1; });
      if (noExcluidos.length === 0) {
        items.forEach(function (h) { registrarLog_(logSheet, clave, h.titular, 'excluido', null, h.monto, h.vencimiento, h.file.getName()); });
        return;
      }
      elegido = noExcluidos.sort(function (a, b) { return b.monto - a.monto; })[0];
    }

    items.forEach(function (h) {
      if (h === elegido) return;
      var estado = TITULARES_EXCLUIDOS.indexOf(h.titular) !== -1 ? 'excluido' : 'descartado_por_par';
      registrarLog_(logSheet, clave, h.titular, estado, null, h.monto, h.vencimiento, h.file.getName());
    });

    if (TITULARES_EXCLUIDOS.indexOf(elegido.titular) !== -1) {
      registrarLog_(logSheet, clave, elegido.titular, 'excluido', null, elegido.monto, elegido.vencimiento, elegido.file.getName());
      return;
    }

    var configActual = leerConfig_(configSheet);
    if (!configActual[clave]) {
      pendientesSheet.appendRow([new Date(), clave, elegido.monto, elegido.vencimiento, elegido.file.getName(), elegido.file.getUrl()]);
      registrarLog_(logSheet, clave, elegido.titular, 'pendiente_confirmacion', null, elegido.monto, elegido.vencimiento, elegido.file.getName());
      return;
    }

    var fila = configActual[clave].fila;
    var anterior = parseFloat(String(configActual[clave].valor).replace(/\./g, '').replace(',', '.'));
    configSheet.getRange(fila, 2).setValue(elegido.monto);

    var variacion = (anterior && !isNaN(anterior)) ? ((elegido.monto - anterior) / anterior * 100) : null;
    registrarLog_(logSheet, clave, elegido.titular, 'actualizado', anterior, elegido.monto, elegido.vencimiento, elegido.file.getName());

    reporteConfig.push({
      proveedor: clave, anterior: anterior, nuevo: elegido.monto,
      variacion: variacion, vencimiento: elegido.vencimiento, archivo: elegido.file.getName()
    });
  });

  return reporteConfig;
}

/**
 * Procesa un comprobante de transferencia (PDF o foto): identifica quién la
 * hizo, a quién fue, el monto y la fecha, y si corresponde la agrega como
 * fila de gasto en Tarjetas (Medio = "Transferencia", nunca "Tarjeta
 * Crédito", para no mezclarla con consumos de tarjeta) para que el
 * presupuesto mensual de la app la cuente en el ciclo que corresponda.
 */
function procesarTransferencia_(texto, file, tarjetasSheet, logSheet, pendientesSheet, procesadasFolder) {
  var originante = identificarOriginanteTransferencia_(texto);
  if (originante === 'EXCLUIDO') {
    registrarLog_(logSheet, 'transferencia', 'excluido', 'excluido', null, null, null, file.getName());
    moverAProcesadas_(file, procesadasFolder);
    return null;
  }

  var monto = extraerMontoTransferencia_(texto);
  var fecha = extraerFechaTransferencia_(texto);

  if (!monto) {
    Logger.log('No se pudo extraer el monto de la transferencia ' + file.getName());
    return null; // se deja en la carpeta para revisar a mano
  }

  // Transferencia entre cuentas propias (ej. de Banco Nación a Mercado Pago
  // antes de mandar el diezmo): no es un gasto real, se registra excluida
  // del presupuesto (misma categoría que ya usa la app, "Transferencia Interna").
  if (esTransferenciaInterna_(texto)) {
    var cuentaInterna = extraerCuentaBanco_(texto);
    tarjetasSheet.appendRow([
      fecha || '', cuentaInterna, 'Transferencia', extraerNroOperacion_(texto),
      'Transferencia entre cuentas propias', 'Transferencia entre cuentas propias', monto, 'S',
      'Transferencia Interna', '', 'Núcleo', 'N',
      'Conciliado', 'Foto', '', originante,
      extraerHoraTransferencia_(texto), 1, '', '', 'TRANSFERENCIA'
    ]);
    registrarLog_(logSheet, 'Transferencia Interna', originante, 'transferencia_interna', null, monto, fecha, file.getName());
    moverAProcesadas_(file, procesadasFolder);
    return null;
  }

  var beneficiario = identificarBeneficiarioTransferencia_(texto);
  if (!beneficiario) {
    pendientesSheet.appendRow([new Date(), 'transferencia_sin_clasificar', monto, fecha, file.getName(), file.getUrl()]);
    registrarLog_(logSheet, 'transferencia_sin_clasificar', originante, 'pendiente_confirmacion', null, monto, fecha, file.getName());
    moverAProcesadas_(file, procesadasFolder);
    return null;
  }

  var nroOperacion = extraerNroOperacion_(texto);
  var cuenta = extraerCuentaBanco_(texto);
  var hora = extraerHoraTransferencia_(texto);

  // Mismo orden de columnas que ya usa la hoja Tarjetas:
  // Fecha | Cuenta | Medio | NroComprobante | Comercio | DescripcionRaw | Monto | Signo |
  // Categoria | Subcategoria | Familia | Hormiga | Conciliado | Fuente | Nota | USUARIO |
  // Hora | Cuotas | Ultimos4 | Ubicacion | TipoMovimiento
  tarjetasSheet.appendRow([
    fecha || '', cuenta, 'Transferencia', nroOperacion,
    beneficiario.comercio, beneficiario.comercio, monto, 'S',
    beneficiario.categoria, beneficiario.subcategoria || '', 'Núcleo', 'N',
    'Conciliado', 'Foto', '', originante,
    hora, 1, '', '', 'TRANSFERENCIA'
  ]);

  registrarLog_(logSheet, beneficiario.categoria, originante, 'transferencia_registrada', null, monto, fecha, file.getName());
  moverAProcesadas_(file, procesadasFolder);

  // El diezmo es siempre el 10% del ingreso: cada vez que llega uno nuevo
  // (más reciente que el último usado), se recalcula solo ingreso_mes_actual
  // en Config. Así nunca hay que cargar el sueldo a mano.
  if (beneficiario.categoria === 'Diezmo') {
    actualizarIngresoDesdeDiezmo_(fecha, monto);
  }

  return { categoria: beneficiario.categoria, monto: monto, fecha: fecha, archivo: file.getName() };
}

// El ingreso se deriva siempre del diezmo más reciente que se haya procesado
// (ingreso = diezmo ÷ 10%), guardando esa fecha en las propiedades del
// script para no dejar que un diezmo viejo (ej. de un backfill) pise un
// ingreso ya actualizado con uno más nuevo.
function actualizarIngresoDesdeDiezmo_(fecha, montoDiezmo) {
  if (!fecha) return;
  var props = PropertiesService.getScriptProperties();
  var fechaGuardada = props.getProperty('ingreso_fecha_base');
  var fechaNueva = parsearFechaComparable_(fecha);
  if (fechaGuardada && fechaNueva <= parsearFechaComparable_(fechaGuardada)) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  var configActual = leerConfig_(configSheet);
  var ingreso = Math.round((montoDiezmo / 0.10) * 100) / 100;
  if (configActual['ingreso_mes_actual']) {
    configSheet.getRange(configActual['ingreso_mes_actual'].fila, 2).setValue(ingreso);
  } else {
    configSheet.appendRow(['ingreso_mes_actual', ingreso]);
  }
  props.setProperty('ingreso_fecha_base', fecha);
}

function parsearFechaComparable_(fechaStr) {
  var partes = String(fechaStr).split('/');
  if (partes.length !== 3) return 0;
  return parseInt(partes[2], 10) * 10000 + parseInt(partes[1], 10) * 100 + parseInt(partes[0], 10);
}

// ---------- helpers: archivos y OCR ----------

function listarArchivosPendientes_(folder) {
  var mimesValidos = [MimeType.PDF, MimeType.JPEG, MimeType.PNG];
  var files = [];
  var it = folder.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (mimesValidos.indexOf(f.getMimeType()) !== -1) files.push(f);
  }
  return files;
}

function extraerTextoArchivo_(file) {
  var resource = { name: file.getName() + '_ocr_temp', mimeType: MimeType.GOOGLE_DOCS };
  var tempDoc = Drive.Files.create(resource, file.getBlob(), { ocr: true, ocrLanguage: 'es' });
  var texto = DocumentApp.openById(tempDoc.id).getBody().getText();
  DriveApp.getFileById(tempDoc.id).setTrashed(true);
  return normalizarSuperindices_(texto);
}

// Mercado Pago muestra los centavos como superíndice (ej. "$166.575²²"). El
// OCR de Drive a veces preserva esos caracteres unicode y a veces los
// concatena directo como dígitos normales — esto normaliza el primer caso
// para que quede igual que el segundo, y parsearMonto_ ya sabe separar los
// últimos 2 dígitos pegados como centavos.
function normalizarSuperindices_(texto) {
  var mapa = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
  return texto.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, function (ch) { return mapa[ch]; });
}

// ---------- helpers: facturas (Config) ----------

// Un resumen de tarjeta de crédito puede mencionar "Swiss Medical", "Edenor",
// etc. como uno de decenas de consumos — eso no lo convierte en una factura
// de ese proveedor. Se detecta por sus etiquetas propias de resumen.
function esResumenTarjeta_(texto) {
  return /Estado\s*de\s*cuenta|Pago\s*M[ií]nimo|L[ií]mite\s*de\s*Compra|Cierre\s*Anterior/i.test(texto);
}

function identificarProveedor_(texto) {
  for (var clave in PROVEEDORES) {
    var patrones = PROVEEDORES[clave];
    for (var i = 0; i < patrones.length; i++) {
      if (patrones[i].test(texto)) return clave;
    }
  }
  return null;
}

function identificarTitular_(texto) {
  var mayus = texto.toUpperCase();
  for (var i = 0; i < TITULARES_EXCLUIDOS.length; i++) {
    if (mayus.indexOf(TITULARES_EXCLUIDOS[i]) !== -1) return TITULARES_EXCLUIDOS[i];
  }
  if (/GASTRELL?\s*,?\s*EDUARDO\s*FRANCO/i.test(texto)) return 'GASTRELL EDUARDO FRANCO';
  if (/ZIEGLER\s*ROMINA\s*EMILIA/i.test(texto)) return 'ZIEGLER ROMINA EMILIA';
  return null;
}

function extraerMontoTotal_(texto) {
  var m = texto.match(/TOTAL\s*A\s*PAGAR[^\d$]{0,40}\$?\s*([\d.]+,\d{2})/i);
  // Swiss Medical no usa "TOTAL A PAGAR" para el monto (ese texto está pegado
  // a una fecha en su formato); su primer monto real y confiable es el de
  // "Vencimiento al [fecha]" (el de la cuota al día, antes de los recargos).
  if (!m) m = texto.match(/Vencimiento\s*al\s*[\d\/]+[^\d$]{0,20}\$?\s*([\d.]+,\d{2})/i);
  if (!m) m = texto.match(/\$\s*([\d]{1,3}(?:\.\d{3})*,\d{2})/);
  if (!m) return null;
  return parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
}

function extraerVencimiento_(texto) {
  var m = texto.match(/Vencimiento[:\s]*([0-3]?\d[\/\-][01]?\d[\/\-]\d{2,4})/i);
  return m ? m[1] : null;
}

function leerConfig_(sheet) {
  var data = sheet.getDataRange().getValues();
  var map = {};
  for (var i = 0; i < data.length; i++) {
    if (data[i][0]) map[data[i][0]] = { fila: i + 1, valor: data[i][1] };
  }
  return map;
}

// ---------- helpers: transferencias (Tarjetas) ----------

// Quién hizo la transferencia. Por defecto se asume Eduardo (es su Drive),
// salvo que el texto identifique explícitamente a Romina, o a alguno de los
// titulares siempre excluidos (en cuyo caso se descarta directamente).
function identificarOriginanteTransferencia_(texto) {
  var mayus = texto.toUpperCase();
  for (var i = 0; i < TITULARES_EXCLUIDOS.length; i++) {
    if (mayus.indexOf(TITULARES_EXCLUIDOS[i]) !== -1) return 'EXCLUIDO';
  }
  if (/ZIEGLER\s*ROMINA\s*EMILIA/i.test(texto)) return 'ZIEGLER ROMINA EMILIA';
  return 'GASTRELL EDUARDO FRANCO';
}

function identificarBeneficiarioTransferencia_(texto) {
  for (var i = 0; i < BENEFICIARIOS_TRANSFERENCIA.length; i++) {
    var b = BENEFICIARIOS_TRANSFERENCIA[i];
    for (var j = 0; j < b.patrones.length; j++) {
      if (b.patrones[j].test(texto)) return b;
    }
  }
  return null;
}

// Si el nombre del titular aparece dos veces (como origen Y como destino),
// es una transferencia entre cuentas propias, no un pago a un tercero.
function esTransferenciaInterna_(texto) {
  var patron = /GASTRELL\s*,?\s*EDUARDO\s*FRANCO|EDUARDO\s*FRANCO\s*GASTRELL/gi;
  var matches = texto.match(patron);
  return !!matches && matches.length >= 2;
}

function esOrdenTransferencia_(texto) {
  return /Transferencia\s*(Inmediata|enviada|recibida)?|Transferido|Comprobante\s*de\s*transferencia|Detalle\s*de\s*la\s*transferencia/i.test(texto);
}

function extraerMontoTransferencia_(texto) {
  var patrones = [
    /Importe\s*[Dd]ebitado[^\d$]{0,20}\$?\s*([\d.,]+)/i,
    /\bMonto\b[^\d$]{0,20}\$?\s*([\d.,]+)/i,
    /\$\s*([\d][\d.,]*\d|\d)/
  ];
  for (var i = 0; i < patrones.length; i++) {
    var m = texto.match(patrones[i]);
    if (m) {
      var val = parsearMonto_(m[1]);
      if (val) return val;
    }
  }
  return null;
}

// Convierte strings de monto en distintos formatos (1.234,56 / 1234.56 / 1.234)
// a número. Además corrige un caso particular de OCR: cuando el comprobante
// muestra los centavos en superíndice (ej. Mercado Pago "$166.575²²"), Drive
// suele leerlo pegado sin separador ("166.57522"): si después del último
// punto quedan más de 3 dígitos, los últimos 2 son los centavos reales.
function parsearMonto_(str) {
  str = String(str).trim();
  var m = str.match(/^([\d.,]*\d)[.,](\d{2})$/);
  if (m) return parseFloat(m[1].replace(/[.,]/g, '') + '.' + m[2]);

  var m2 = str.match(/^(\d{1,3}(?:\.\d{3})*)\.(\d{3,})$/);
  if (m2 && m2[2].length > 3) {
    var grupo3 = m2[2].slice(0, 3);
    var centavos = m2[2].slice(3);
    return parseFloat((m2[1] + grupo3).replace(/\./g, '') + '.' + centavos);
  }

  var soloDigitos = str.replace(/[.,]/g, '');
  return soloDigitos ? parseFloat(soloDigitos) : null;
}

function extraerFechaTransferencia_(texto) {
  var m = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return pad2_(m[1]) + '/' + pad2_(m[2]) + '/' + m[3];

  m = texto.match(/(\d{1,2})\/([a-zA-Zñ]+)\/(\d{4})/i);
  if (m && MESES_ES[m[2].toLowerCase()]) return pad2_(m[1]) + '/' + pad2_(MESES_ES[m[2].toLowerCase()]) + '/' + m[3];

  m = texto.match(/(\d{1,2})\s+de\s+([a-zA-Zñ]+)\s+de\s+(\d{4})/i);
  if (m && MESES_ES[m[2].toLowerCase()]) return pad2_(m[1]) + '/' + pad2_(MESES_ES[m[2].toLowerCase()]) + '/' + m[3];

  return null;
}

function extraerHoraTransferencia_(texto) {
  var m = texto.match(/(\d{1,2}:\d{2}(?::\d{2})?)\s*h?s?\b/);
  return m ? m[1] : '';
}

function extraerNroOperacion_(texto) {
  var patrones = [
    /Nro\.?\s*de\s*[Oo]peraci[oó]n[:\s]*([A-Za-z0-9]+)/i,
    /N[°º.\s]*de\s*operaci[oó]n[^\n:]*[:\s]*([A-Za-z0-9]+)/i,
    /N[uú]mero\s*de\s*[Tt]ransacci[oó]n[:\s]*([A-Za-z0-9]+)/i,
    /C[oó]digo\s*de\s*operaci[oó]n[:\s]*([A-Za-z0-9]+)/i
  ];
  for (var i = 0; i < patrones.length; i++) {
    var m = texto.match(patrones[i]);
    if (m) return m[1];
  }
  return '';
}

function extraerCuentaBanco_(texto) {
  if (/GALICIA/i.test(texto)) return 'Banco Galicia';
  if (/\bBNA\+?\b/i.test(texto) || /Banco\s*(de\s*la\s*)?Naci[oó]n/i.test(texto)) return 'Banco Nación (BNA+)';
  if (/MERCADO\s*PAGO/i.test(texto)) return 'Mercado Pago';
  return 'Transferencia Bancaria';
}

function pad2_(n) {
  n = String(n);
  return n.length < 2 ? '0' + n : n;
}

// ---------- helpers: comunes ----------

function obtenerOCrearHoja_(ss, nombre, encabezados) {
  var sheet = ss.getSheetByName(nombre);
  if (!sheet) {
    sheet = ss.insertSheet(nombre);
    sheet.appendRow(encabezados);
  }
  return sheet;
}

function obtenerOCrearSubcarpeta_(folder, nombre) {
  var it = folder.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : folder.createFolder(nombre);
}

function moverAProcesadas_(file, procesadasFolder) {
  procesadasFolder.addFile(file);
  file.getParents().next().removeFile(file); // saca de la carpeta original (idempotencia)
}

function registrarLog_(logSheet, proveedor, titular, estado, anterior, nuevo, fechaOVencimiento, archivo) {
  logSheet.appendRow([new Date(), proveedor, titular || '', estado, anterior || '', nuevo || '', '', fechaOVencimiento || '', archivo]);
}

function enviarResumen_(reporteConfig, reporteTransferencias) {
  var lineas = [];

  if (reporteConfig.length > 0) {
    lineas.push('Montos de referencia actualizados en Config:');
    reporteConfig.forEach(function (r) {
      var anterior = r.anterior ? ('$' + r.anterior.toLocaleString('es-AR')) : '— (fila nueva)';
      var variacion = r.variacion !== null ? (r.variacion >= 0 ? '+' : '') + r.variacion.toFixed(1) + '%' : '';
      lineas.push('- ' + r.proveedor + ': ' + anterior + ' -> $' + r.nuevo.toLocaleString('es-AR') + ' (' + variacion + ') | vto ' + r.vencimiento + ' | ' + r.archivo);
    });
  }

  if (reporteTransferencias.length > 0) {
    if (lineas.length > 0) lineas.push('');
    lineas.push('Transferencias registradas como gasto en Tarjetas:');
    reporteTransferencias.forEach(function (r) {
      lineas.push('- ' + r.categoria + ': $' + r.monto.toLocaleString('es-AR') + ' | ' + (r.fecha || 'sin fecha') + ' | ' + r.archivo);
    });
  }

  MailApp.sendEmail(EMAIL_NOTIFICACIONES, 'Gazelle: actualización automática', lineas.join('\n'));
}

/**
 * Utilidad de una sola vez: carga en Config los 4 proveedores que ya
 * habían quedado confirmados por chat (Edenor Eduardo, Swiss Medical,
 * Gas Natural Eduardo, Internet Urunet) con sus montos correctos, y
 * limpia esas 4 filas de Pendientes_Confirmacion. Se puede borrar esta
 * función después de correrla una vez.
 */
function cargarProveedoresIniciales() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  var pendientesSheet = ss.getSheetByName(PENDIENTES_SHEET_NAME);

  var valores = {
    edenor_eduardo: 269150.22,
    swiss_medical: 462120.48,
    gas_natural_eduardo: 137076.07,
    internet_urunet: 35382
  };

  var configActual = leerConfig_(configSheet);
  var hechas = [];
  Object.keys(valores).forEach(function (clave) {
    if (configActual[clave]) {
      configSheet.getRange(configActual[clave].fila, 2).setValue(valores[clave]);
    } else {
      configSheet.appendRow([clave, valores[clave]]);
    }
    hechas.push(clave + ' = ' + valores[clave]);
  });

  if (pendientesSheet) {
    var data = pendientesSheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      if (valores.hasOwnProperty(data[i][1])) pendientesSheet.deleteRow(i + 1);
    }
  }

  Logger.log('Config actualizado:\n' + hechas.join('\n'));
}

/**
 * Utilidad de una sola vez: borra las filas de diezmo duplicadas en
 * Tarjetas (mismo Fecha+Monto, Categoria=Diezmo, Fuente=Foto) dejando
 * solo una de cada una, y borra de Pendientes_Confirmacion la fila del
 * comprobante que ya identificamos como transferencia entre cuentas
 * propias. Se puede borrar esta función después de correrla una vez.
 */
function limpiarDuplicadosDiezmo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tarjetasSheet = ss.getSheetByName(TARJETAS_SHEET_NAME);
  var pendientesSheet = ss.getSheetByName(PENDIENTES_SHEET_NAME);

  var data = tarjetasSheet.getDataRange().getValues();
  var vistos = {};
  var filasABorrar = [];
  for (var i = 1; i < data.length; i++) {
    var categoria = data[i][8];
    var fuente = data[i][13];
    if (categoria !== 'Diezmo' || fuente !== 'Foto') continue;
    var clave = data[i][0] + '|' + data[i][6];
    if (vistos[clave]) {
      filasABorrar.push(i + 1);
    } else {
      vistos[clave] = true;
    }
  }
  filasABorrar.sort(function (a, b) { return b - a; });
  filasABorrar.forEach(function (fila) { tarjetasSheet.deleteRow(fila); });

  var pendientesBorradas = 0;
  if (pendientesSheet) {
    var pdata = pendientesSheet.getDataRange().getValues();
    for (var j = pdata.length - 1; j >= 1; j--) {
      if (pdata[j][4] === 'DOC-20260830-WA0002.pdf') {
        pendientesSheet.deleteRow(j + 1);
        pendientesBorradas++;
      }
    }
  }

  Logger.log('Filas de Tarjetas borradas (duplicados de diezmo): ' + filasABorrar.length +
    '\nFilas de Pendientes_Confirmacion borradas: ' + pendientesBorradas);
}

/**
 * Utilidad de una sola vez: actualiza el fondo BS3 en Config al último
 * depósito confirmado por chat (USD 3.997,49, antes era USD 3.643). Se
 * puede borrar esta función después de correrla una vez.
 */
function actualizarFondoBS3() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  var configActual = leerConfig_(configSheet);

  var nuevoValor = 3997.49;
  if (configActual['fondo_bs3_usd']) {
    configSheet.getRange(configActual['fondo_bs3_usd'].fila, 2).setValue(nuevoValor);
  } else {
    configSheet.appendRow(['fondo_bs3_usd', nuevoValor]);
  }

  Logger.log('fondo_bs3_usd actualizado a ' + nuevoValor);
}

/**
 * Utilidad de una sola vez: primer cálculo automático del ingreso, a
 * partir del diezmo real del 30/08/2026 ($491.783,76 ÷ 10%), y deja
 * marcada esa fecha como base para que de ahora en más el ingreso se
 * recalcule solo con cada diezmo nuevo. Se puede borrar esta función
 * después de correrla una vez.
 */
function primerIngresoAutomatico() {
  actualizarIngresoDesdeDiezmo_('30/08/2026', 491783.76);
  var props = PropertiesService.getScriptProperties();
  Logger.log('ingreso_mes_actual y ingreso_fecha_base (' + props.getProperty('ingreso_fecha_base') + ') actualizados.');
}

/**
 * Correr ESTA función una sola vez desde el editor de Apps Script
 * (▶ Ejecutar) para autorizar el acceso y dejar el trigger horario
 * configurado. Es el único clic manual de todo el proceso.
 */
function configurarTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'actualizarMontosReferencia') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('actualizarMontosReferencia').timeBased().everyHours(6).create();
  actualizarMontosReferencia(); // primera corrida inmediata
}

// ======================================================================
// RITMO SEMANAL — cuánto se puede gastar por día/semana en cada categoría
// para llegar holgado al techo del ciclo. Se recalcula solo, todos los
// días, con los datos reales de Tarjetas — no depende de que se abra la
// app ni de que nadie lo pida. El sangrado a Romina quedó eliminado: ya
// no se maneja como transferencia fija, se cubre con reservas de MP.
//
// IMPORTANTE: estos techos son un espejo de TECHOS_BS3 en index.html. Si
// se cambia un techo en un lado, hay que cambiarlo en el otro también.
// ======================================================================

var TECHOS_BS3 = {
  'Alimentación': 670000, 'Salud': 550000, 'Servicios': 380000, 'Educación': 420000,
  'Vehículo': 320000, 'Comida Fuera': 170000, 'Entretenimiento': 100000, 'Indumentaria': 150000,
  'Transporte': 80000, 'Compras Online': 130000, 'Hogar': 40000, 'Otros': 140000
};

var CATS_EXCLUIDAS_RITMO = ['Pago Tarjeta', 'Banco', 'Transferencia Interna', 'Diezmo'];

var RITMO_SHEET_NAME = 'Ritmo_Semanal';

// Segundo jueves-anteúltimo del mes: mismo criterio que usa la app (index.html,
// anteultimoJueves) para cerrar los ciclos mensuales de presupuesto.
function anteultimoJueves_(year, month) {
  var jueves = [];
  var d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    if (d.getDay() === 4) jueves.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return jueves[jueves.length - 2];
}

function obtenerCicloActual_() {
  var hoy = new Date();
  var y = hoy.getFullYear(), m = hoy.getMonth() + 1;
  var mesAnt = m - 1, yAnt = y; if (mesAnt < 1) { mesAnt = 12; yAnt = y - 1; }
  var mesSig = m + 1, ySig = y; if (mesSig > 12) { mesSig = 1; ySig = y + 1; }

  var finEsteMes = anteultimoJueves_(y, m);
  var finMesAnterior = anteultimoJueves_(yAnt, mesAnt);
  var finMesSiguiente = anteultimoJueves_(ySig, mesSig);

  var inicio, fin;
  if (hoy > finMesAnterior && hoy <= finEsteMes) {
    inicio = new Date(finMesAnterior); inicio.setDate(inicio.getDate() + 1);
    fin = finEsteMes;
  } else if (hoy > finEsteMes) {
    inicio = new Date(finEsteMes); inicio.setDate(inicio.getDate() + 1);
    fin = finMesSiguiente;
  } else {
    var mesAnt2 = mesAnt - 1, yAnt2 = yAnt; if (mesAnt2 < 1) { mesAnt2 = 12; yAnt2 = yAnt - 1; }
    var finMesAntAnt = anteultimoJueves_(yAnt2, mesAnt2);
    inicio = new Date(finMesAntAnt); inicio.setDate(inicio.getDate() + 1);
    fin = finMesAnterior;
  }
  inicio.setHours(0, 0, 0, 0);
  fin.setHours(23, 59, 59, 999);
  return { inicio: inicio, fin: fin };
}

function parsearFechaCelda_(valor) {
  if (valor instanceof Date) return valor;
  var m = String(valor).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
}

// Gasto real por categoría dentro del ciclo, replicando exactamente la
// lógica de gastosReales() en index.html: excluye a SEGOVIA/ALFREDO
// (Padres), excluye categorías no presupuestables, cuotas se dividen solo
// si la fila no vino de un resumen en PDF, y solo cuenta Signo='S' (egreso).
function calcularGastoPorCategoria_(tarjetasSheet, inicio, fin) {
  var data = tarjetasSheet.getDataRange().getValues();
  var headers = data[0];
  var idx = {};
  headers.forEach(function (h, i) { idx[h] = i; });
  var totales = {};

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    var usuario = String(row[idx['USUARIO']] || '');
    if (usuario.indexOf('SEGOVIA') !== -1 || usuario.indexOf('ALFREDO') !== -1) continue;

    var cat = String(row[idx['Categoria']] || 'Otros').trim();
    if (CATS_EXCLUIDAS_RITMO.indexOf(cat) !== -1) continue;

    var fecha = parsearFechaCelda_(row[idx['Fecha']]);
    if (!fecha || fecha < inicio || fecha > fin) continue;

    var montoRaw = parseFloat(row[idx['Monto']]);
    if (isNaN(montoRaw)) continue;
    var signo = String(row[idx['Signo']] || 'S');
    var fuente = String(row[idx['Fuente']] || '');
    var numCuotas = 1;
    if (fuente !== 'PDF') {
      var cr = parseFloat(row[idx['Cuotas']]);
      if (!isNaN(cr) && cr > 0) numCuotas = Math.max(cr, 1);
    }
    var monto = signo === 'E' ? -montoRaw : montoRaw / numCuotas;
    if (monto <= 0) continue;

    totales[cat] = (totales[cat] || 0) + monto;
  }
  return totales;
}

function calcularRitmoSemanal_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tarjetasSheet = ss.getSheetByName(TARJETAS_SHEET_NAME);
  var ciclo = obtenerCicloActual_();
  var gastado = calcularGastoPorCategoria_(tarjetasSheet, ciclo.inicio, ciclo.fin);

  var hoy = new Date();
  var diasRestantes = Math.max(Math.ceil((ciclo.fin - hoy) / 86400000) + 1, 0);
  var diasTotales = Math.max(Math.ceil((ciclo.fin - ciclo.inicio) / 86400000) + 1, 1);
  var diasTranscurridos = diasTotales - diasRestantes;
  var pctTiempo = diasTranscurridos / diasTotales;

  var resultado = [];
  Object.keys(TECHOS_BS3).forEach(function (cat) {
    var techo = TECHOS_BS3[cat];
    var real = gastado[cat] || 0;
    var restante = Math.max(techo - real, 0);
    var ritmoDiario = diasRestantes > 0 ? restante / diasRestantes : restante;
    var ritmoSemanal = ritmoDiario * 7;
    var pctGastado = techo > 0 ? real / techo : 0;
    var riesgo = real >= techo ? 'agotado' : (pctGastado - pctTiempo > 0.15 ? 'riesgo' : 'ok');
    resultado.push({
      categoria: cat, techo: techo, gastado: real, restante: restante,
      diasRestantes: diasRestantes, ritmoDiario: ritmoDiario, ritmoSemanal: ritmoSemanal,
      pctGastado: pctGastado, pctTiempo: pctTiempo, riesgo: riesgo
    });
  });
  return { ciclo: ciclo, items: resultado };
}

function escribirHojaRitmoSemanal_(reporte) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(RITMO_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(RITMO_SHEET_NAME);
  sheet.clear();
  sheet.appendRow(['Categoría', 'Techo mensual', 'Gastado en el ciclo', 'Restante', 'Días restantes', 'Ritmo diario sugerido', 'Ritmo semanal sugerido', 'Estado', 'Ciclo desde', 'Ciclo hasta']);
  reporte.items.forEach(function (it) {
    sheet.appendRow([
      it.categoria, it.techo, Math.round(it.gastado * 100) / 100, Math.round(it.restante * 100) / 100,
      it.diasRestantes, Math.round(it.ritmoDiario), Math.round(it.ritmoSemanal),
      it.riesgo === 'agotado' ? '🚫 Techo alcanzado' : it.riesgo === 'riesgo' ? '⚠️ Por encima del ritmo' : '✅ En ritmo',
      reporte.ciclo.inicio, reporte.ciclo.fin
    ]);
  });
}

function formatearPesos_(n) {
  return '$' + Math.round(n).toLocaleString('es-AR');
}

/**
 * Recalcula el ritmo diario/semanal de cada categoría (mismos techos que
 * la app, sin sangrado a Romina) y lo deja siempre actualizado en la
 * pestaña Ritmo_Semanal. Manda mail: reporte completo los lunes, y aviso
 * inmediato cualquier día si alguna categoría ya viene gastando más rápido
 * de lo que corresponde según los días transcurridos del ciclo (para poder
 * ajustar las reservas de MP antes de que sea tarde, no después).
 */
function actualizarRitmoSemanal() {
  var reporte = calcularRitmoSemanal_();
  escribirHojaRitmoSemanal_(reporte);

  var esLunes = new Date().getDay() === 1;
  var enRiesgo = reporte.items.filter(function (it) { return it.riesgo !== 'ok'; });

  if (!esLunes && enRiesgo.length === 0) return; // nada urgente y no toca el resumen semanal

  var alimentacion = reporte.items.filter(function (it) { return it.categoria === 'Alimentación'; })[0];
  var lineas = [];
  lineas.push('Ciclo actual: ' + Utilities.formatDate(reporte.ciclo.inicio, Session.getScriptTimeZone(), 'dd/MM') +
    ' al ' + Utilities.formatDate(reporte.ciclo.fin, Session.getScriptTimeZone(), 'dd/MM') +
    ' (quedan ' + (alimentacion ? alimentacion.diasRestantes : '-') + ' días)');
  lineas.push('');

  if (alimentacion) {
    lineas.push('🛒 Alimentación — la que pediste seguir de cerca:');
    lineas.push('  Gastado: ' + formatearPesos_(alimentacion.gastado) + ' de ' + formatearPesos_(alimentacion.techo));
    lineas.push('  Para llegar holgado: ' + formatearPesos_(alimentacion.ritmoDiario) + '/día · ' + formatearPesos_(alimentacion.ritmoSemanal) + '/semana');
    lineas.push('');
  }

  if (enRiesgo.length > 0) {
    lineas.push('⚠️ Categorías gastando más rápido de lo que corresponde (ajustar reserva de MP ya):');
    enRiesgo.forEach(function (it) {
      lineas.push('  - ' + it.categoria + ': ' + Math.round(it.pctGastado * 100) + '% del techo gastado, va ' +
        Math.round((it.pctGastado - it.pctTiempo) * 100) + ' puntos por delante del ritmo del ciclo.');
    });
    lineas.push('');
  }

  lineas.push('Ritmo sugerido por categoría (resto del ciclo):');
  reporte.items.forEach(function (it) {
    lineas.push('  - ' + it.categoria + ': ' + formatearPesos_(it.ritmoDiario) + '/día · ' + formatearPesos_(it.ritmoSemanal) + '/semana' +
      (it.riesgo === 'agotado' ? ' — 🚫 techo alcanzado, evitar más gastos' : ''));
  });

  var asunto = enRiesgo.length > 0 && !esLunes
    ? 'Gazelle: atención — ritmo de gasto por encima del presupuesto'
    : 'Gazelle: ritmo semanal de reservas MP';
  MailApp.sendEmail(EMAIL_NOTIFICACIONES, asunto, lineas.join('\n'));
}

/**
 * Correr UNA SOLA VEZ desde el editor (▶ Ejecutar) para activar el
 * chequeo diario de ritmo de gasto. Además de esto, no hace falta tocar
 * nada más: la pestaña Ritmo_Semanal y el mail se actualizan solos.
 */
function configurarTriggerRitmo() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'actualizarRitmoSemanal') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('actualizarRitmoSemanal').timeBased().everyDays(1).atHour(7).create();
  actualizarRitmoSemanal(); // primera corrida inmediata
}

// Función propia (no la escribí yo): deja anotado en Nota de Tarjetas qué
// medidor de EDENORDA47769858 corresponde a Mirta aunque haya quedado
// cargado en la tarjeta de Eduardo por error. No tocar la lógica, solo se
// preserva acá para que no se pierda al pegar el archivo completo.
function actualizarNotaEdenorMirta() {
  const ss = SpreadsheetApp.openById('15TzS_-VQazdA427n8S7H_FnPD5Fj0eDrRMuETIdNLgQ');
  const sheet = ss.getSheetByName('Tarjetas');
  const data = sheet.getDataRange().getValues();
  let actualizados = 0;
  for (let i = 1; i < data.length; i++) {
    const comercio = String(data[i][4]).trim();
    if (comercio.includes('EDENORDA47769858')) {
      sheet.getRange(i + 1, 15).setValue('Confirmado 13/07: es el medidor de Mirta, cargado por error en la tarjeta de Eduardo. Familia=Padres es correcto. PENDIENTE: migrar este débito a un medio de pago de Mirta.');
      actualizados++;
    }
  }
  Logger.log('Notas actualizadas: ' + actualizados);
}
