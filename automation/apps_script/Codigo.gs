/**
 * Actualización automática de montos de referencia (Config) — Gazelle
 *
 * Corre DENTRO del Google Sheet (Apps Script vinculado), sin terminal,
 * sin gcloud, sin credenciales que guardar. El único paso manual es
 * autorizar una vez (ver README de esta carpeta) y correr
 * configurarTrigger() una sola vez para que quede en automático.
 */

var DRIVE_FOLDER_ID = '1AygsLwG30QaMfFNMuRXZVZNbN-_eANyf';
var CONFIG_SHEET_NAME = 'Config';
var LOG_SHEET_NAME = 'Log_Automatizacion';
var PENDIENTES_SHEET_NAME = 'Pendientes_Confirmacion';
var PROCESADAS_SUBFOLDER = 'Procesadas';
var EMAIL_NOTIFICACIONES = 'efgastrell@gmail.com';

// Titulares cuyas facturas NUNCA deben actualizar Config.
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

/**
 * Punto de entrada. Se corre sola por el trigger de tiempo una vez
 * configurada (ver configurarTrigger).
 */
function actualizarMontosReferencia() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  var logSheet = obtenerOCrearHoja_(ss, LOG_SHEET_NAME,
    ['Fecha', 'Proveedor', 'Titular', 'Estado', 'Monto anterior', 'Monto nuevo', 'Variación', 'Vencimiento', 'Archivo']);
  var pendientesSheet = obtenerOCrearHoja_(ss, PENDIENTES_SHEET_NAME,
    ['Fecha', 'Proveedor', 'Monto', 'Vencimiento', 'Archivo', 'Link']);

  var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var procesadasFolder = obtenerOCrearSubcarpeta_(folder, PROCESADAS_SUBFOLDER);

  var archivos = listarPDFsPendientes_(folder);
  if (archivos.length === 0) return;

  var hallazgos = [];
  for (var i = 0; i < archivos.length; i++) {
    var file = archivos[i];
    var texto;
    try {
      texto = extraerTextoPDF_(file);
    } catch (e) {
      Logger.log('No se pudo leer ' + file.getName() + ': ' + e);
      continue;
    }

    var clave = identificarProveedor_(texto);
    if (!clave) {
      moverAProcesadas_(file, procesadasFolder);
      continue; // no es un proveedor monitoreado, no vuelve a mirarse
    }

    var titular = identificarTitular_(texto);
    var monto = extraerMontoTotal_(texto);
    var vencimiento = extraerVencimiento_(texto);

    if (monto === null) {
      Logger.log('No se pudo extraer el monto de ' + file.getName());
      continue; // se deja en la carpeta para revisar a mano
    }

    hallazgos.push({
      clave: clave, titular: titular, monto: monto, vencimiento: vencimiento,
      file: file
    });
  }

  var porProveedor = {};
  hallazgos.forEach(function (h) {
    (porProveedor[h.clave] = porProveedor[h.clave] || []).push(h);
  });

  var reporte = [];

  Object.keys(porProveedor).forEach(function (clave) {
    var items = porProveedor[clave];

    // Mover todos los archivos de este proveedor en el lote a Procesadas
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

    // Loguear como excluidos/descartados los que no ganaron
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

    reporte.push({
      proveedor: clave, anterior: anterior, nuevo: elegido.monto,
      variacion: variacion, vencimiento: elegido.vencimiento, archivo: elegido.file.getName()
    });
  });

  if (reporte.length > 0) enviarResumen_(reporte);
}

// ---------- helpers ----------

function listarPDFsPendientes_(folder) {
  var files = [];
  var it = folder.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (f.getMimeType() === MimeType.PDF) files.push(f);
  }
  return files;
}

function extraerTextoPDF_(file) {
  var resource = { name: file.getName() + '_ocr_temp', mimeType: MimeType.GOOGLE_DOCS };
  var tempDoc = Drive.Files.create(resource, file.getBlob(), { ocr: true, ocrLanguage: 'es' });
  var texto = DocumentApp.openById(tempDoc.id).getBody().getText();
  DriveApp.getFileById(tempDoc.id).setTrashed(true);
  return texto;
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

function registrarLog_(logSheet, proveedor, titular, estado, anterior, nuevo, vencimiento, archivo) {
  logSheet.appendRow([new Date(), proveedor, titular || '', estado, anterior || '', nuevo, '', vencimiento || '', archivo]);
}

function enviarResumen_(reporte) {
  var lineas = reporte.map(function (r) {
    var anterior = r.anterior ? ('$' + r.anterior.toLocaleString('es-AR')) : '— (fila nueva)';
    var variacion = r.variacion !== null ? (r.variacion >= 0 ? '+' : '') + r.variacion.toFixed(1) + '%' : '';
    return '- ' + r.proveedor + ': ' + anterior + ' -> $' + r.nuevo.toLocaleString('es-AR') + ' (' + variacion + ') | vto ' + r.vencimiento + ' | ' + r.archivo;
  });
  MailApp.sendEmail(EMAIL_NOTIFICACIONES,
    'Gazelle: montos de referencia actualizados',
    'Se actualizaron los siguientes montos de referencia en Config:\n\n' + lineas.join('\n'));
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
