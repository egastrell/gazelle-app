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
  return { categoria: beneficiario.categoria, monto: monto, fecha: fecha, archivo: file.getName() };
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
