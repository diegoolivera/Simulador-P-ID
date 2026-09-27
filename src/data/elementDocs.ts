export interface ElementDoc {
  title: string;
  kind: string;
  description: string;
  usage: string;
  tool: string;
  safety: string;
  commonAlarms: { code?: string; cause: string; resolution: string }[];
}

const VESSEL_DOC: ElementDoc = {
  title: 'Separador trifásico',
  kind: 'Vaso de presión',
  description:
    'Recipiente diseñado para separar la corriente multiforme de pozo en gas, líquido y sólidos por gravedad, impacto y coalescencia.',
  usage:
    'Mantener nivel y presión dentro de los límites operativos. Drenar sedimentos periódicamente. Monitorear diferencial del demister.',
  tool: 'Panel SCADA, válvulas de control PIC/LIC, purga manual con LOTO aplicado.',
  safety:
    'No abrir tapas ni purgas con presión. Aplicar LOTO antes de mantenimiento. Verificar PSV en línea.',
  commonAlarms: [
    { cause: 'Presión alta', resolution: 'Abrir PV de gas a compresión o flare; verificar PSV.' },
    { cause: 'Nivel alto de líquido', resolution: 'Aumentar apertura de LV de salida; verificar bomba downstream.' },
    { cause: 'Nivel bajo de líquido', resolution: 'Reducir LV; cerrar bypass si está abierto.' },
  ],
};

const TANK_DOC: ElementDoc = {
  title: 'Tanque de almacenamiento',
  kind: 'Tanque atmosférico',
  description: 'Recibe líquido del separador y lo almacena antes del bombeo o carga.',
  usage: 'Controlar nivel entre límites. Drenar a pozo de drenaje sólo con permiso.',
  tool: 'Indicador de nivel LIC/LSH, válvula de drenaje manual o automática.',
  safety: 'No sobrepasar nivel alto. Ventilar antes de entrada. LOTO en válvulas de entrada/salida.',
  commonAlarms: [
    { cause: 'Nivel alto', resolution: 'Aumentar bombeo o drenaje; verificar válvula de salida.' },
    { cause: 'Nivel bajo', resolution: 'Reducir salida; revisar aporte upstream.' },
  ],
};

const WELL_DOC: ElementDoc = {
  title: 'Pozo de producción',
  kind: 'Fuente',
  description: 'Aporte de crudo, gas y agua desde el yacimiento hacia la planta.',
  usage: 'Arrancar/detener producción desde cabezal. Monitorear presión de cabeza.',
  tool: 'Cabezal de pozo, válvulas maestra y swab, manifold.',
  safety: 'No cerrar ambas válvulas de cabezal simultáneamente con presión.',
  commonAlarms: [
    { cause: 'Presión de cabeza baja', resolution: 'Revisar aporte; verificar obstrucción en línea.' },
    { cause: 'Presión de cabeza alta', resolution: 'Abrir válvula de producción gradualmente.' },
  ],
};

const MANIFOLD_DOC: ElementDoc = {
  title: 'Manifold de cabezales',
  kind: 'Header',
  description: 'Colecta la producción de varios pozos y la dirige al tren de separación.',
  usage: 'Rutear flujo, balancear aportes, aislar pozos para mantenimiento.',
  tool: 'Válvulas de aislamiento del manifold.',
  safety: 'Asegurar que al menos una ruta esté abierta antes de cerrar otra.',
  commonAlarms: [
    { cause: 'Presión alta', resolution: 'Abrir ruta alternativa; verificar válvulas cerradas.' },
  ],
};

const MANUAL_VALVE_DOC: ElementDoc = {
  title: 'Válvula manual',
  kind: 'Válvula de aislamiento',
  description: 'Permite aislar tramos de proceso para mantenimiento o ruteo manual.',
  usage: 'Abrir/cerrar desde SCADA o campo según procedimiento. Indicar posición real.',
  tool: 'Volante o actuador manual. En SCADA: click en el elemento y botón Toggle.',
  safety: 'Verificar que no haya presión diferencial alta antes de operar. Aplicar LOTO si queda cerrada por mantenimiento.',
  commonAlarms: [
    { cause: 'Posición desviada', resolution: 'Confirmar comando; verificar actuador o bloqueo mecánico.' },
  ],
};

const CONTROL_VALVE_DOC: ElementDoc = {
  title: 'Válvula de control',
  kind: 'Válvula automática',
  description: 'Regula caudal, presión o nivel según la salida de un lazo de control.',
  usage: 'Operar en AUTO siguiendo el setpoint del controlador, o en MAN para apertura manual.',
  tool: 'Controlador PID (PIC, LIC, FIC). En SCADA: cambiar modo y setpoint.',
  safety: 'En MAN, el operador asume control total. Verificar fail position (FC/FO/FL) ante falla de aire.',
  commonAlarms: [
    { cause: 'Desviación de PV respecto a SP', resolution: 'Revisar tuning, saturación de válvula, o modo MAN.' },
    { cause: 'Apertura al 0 o 100%', resolution: 'Verificar capacidad del lazo; chequear bloqueo mecánico.' },
  ],
};

const SDV_DOC: ElementDoc = {
  title: 'Válvula de cierre de emergencia (SDV)',
  kind: 'Válvula ON/OFF por seguridad',
  description: 'Cierra automáticamente ante ESD, interlock o condición crítica.',
  usage: 'Permanecer abierta en operación normal. Cierra por señal de seguridad.',
  tool: 'Botón ESD, interlocks, botón manual de disparo.',
  safety: 'No forzar apertura con ESD activo. Resetear ESD y cumplir checklist antes de rearme.',
  commonAlarms: [
    { cause: 'Disparo por ESD', resolution: 'Confirmar causa, resetear ESD, verificar checklist, rearmar.' },
    { cause: 'Falla de aire a instrumentos', resolution: 'Restaurar instrument air; la válvula irá a fail position.' },
  ],
};

const BDV_DOC: ElementDoc = {
  title: 'Válvula de descarga a flare (BDV)',
  kind: 'Válvula de alivio pilotada',
  description: 'Abre para descargar gas excedente al flare y proteger el equipo.',
  usage: 'Accionada por señal de PS<instrumentos> o manual desde SCADA para emergencia.',
  tool: 'Señal de presión alta o botón manual.',
  safety: 'Verificar que el flare esté encendido antes de abrir BDV con hidrocarburos.',
  commonAlarms: [
    { cause: 'Apertura por presión alta', resolution: 'Reducir presión upstream; cerrar BDV cuando estabilice.' },
  ],
};

const PSV_DOC: ElementDoc = {
  title: 'Válvula de seguridad (PSV)',
  kind: 'Dispositivo de alivio mecánico',
  description: 'Se abre mecánicamente si la presión supera el setpoint de diseño.',
  usage: 'Protección pasiva; no se opera manualmente. Se testea en taller.',
  tool: 'Ninguno en operación. Verificación periódica en mantenimiento.',
  safety: 'No bloquear nunca. Si levanta, investigar sobrepresión.',
  commonAlarms: [
    { cause: 'Levante de PSV', resolution: 'Aislar y reparar; identificar causa de sobrepresión.' },
  ],
};

const TRANSMITTER_DOC: ElementDoc = {
  title: 'Transmisor de campo',
  kind: 'Instrumento',
  description: 'Mide presión, nivel, caudal o temperatura y envía la señal al controlador.',
  usage: 'Monitorear variable de proceso. Validar lectura contra indicador local.',
  tool: 'Multímetro, manómetro de referencia, comunicador HART.',
  safety: 'No despresurizar impulse line sin procedimiento.',
  commonAlarms: [
    { cause: 'Lectura fuera de rango', resolution: 'Chequear tapón, purge, cableado; calibrar.' },
    { cause: 'Diferencial alta', resolution: 'Limpiar taps; verificar líneas de impulsión.' },
  ],
};

const CONTROLLER_DOC: ElementDoc = {
  title: 'Controlador PID',
  kind: 'Lazo de control',
  description: 'Compara variable de proceso (PV) con setpoint (SP) y ajusta la válvula.',
  usage: 'Seleccionar modo AUTO/MAN, ajustar SP, monitorear desviación.',
  tool: 'Panel del lazo en SCADA.',
  safety: 'Cambios de SP grandes deben hacerse graduales para no golpear el proceso.',
  commonAlarms: [
    { cause: 'PV fuera de límites', resolution: 'Verificar transmisor, proceso y acción del controlador.' },
  ],
};

const FLARE_DOC: ElementDoc = {
  title: 'Sistema de flare',
  kind: 'Sistema de seguridad',
  description: 'Quema gases liberados por BDV, PSV o purgas para disiparlos de forma segura.',
  usage: 'Mantener piloto encendido. Monitorear presión de header de flare.',
  tool: 'Panel de flare, ignitores.',
  safety: 'No descargar líquidos al flare. Mantener área restringida.',
  commonAlarms: [
    { cause: 'Presión alta en header', resolution: 'Verificar válvulas de alivio abiertas; revisar capacidad de flare.' },
  ],
};

const UTILITY_COMPRESSOR_DOC: ElementDoc = {
  title: 'Compresor de aire de instrumentos',
  kind: 'Equipo rotativo',
  description: 'Suministra aire seco y comprimido para actuadores e instrumentos neumáticos.',
  usage: 'Mantener presión de header entre 6 y 8 barg. Alternar compresores.',
  tool: 'Panel de arranque/parada, secador.',
  safety: 'Sin instrument air, las válvulas neumáticas van a fail position.',
  commonAlarms: [
    { cause: 'Presión baja de IA', resolution: 'Arrancar compresor standby; revisar fugas.' },
  ],
};

const UTILITY_PUMP_DOC: ElementDoc = {
  title: 'Bomba de agua de enfriamiento',
  kind: 'Equipo rotativo',
  description: 'Circula agua de enfriamiento por los intercambiadores y equipos.',
  usage: 'Mantener presión de header. Alternar bombas.',
  tool: 'Panel de arranque/parada.',
  safety: 'Verificar lubricación y sellos antes de arranque.',
  commonAlarms: [
    { cause: 'Presión baja de CW', resolution: 'Arrancar bomba standby; revisar filtros.' },
  ],
};

const UTILITY_HEADER_DOC: ElementDoc = {
  title: 'Header de utilidades',
  kind: 'Distribución',
  description: 'Distribuye aire, agua, gas combustible o energía eléctrica a los consumidores.',
  usage: 'Monitorear presión/tensión. Aislar consumidores sólo con permiso.',
  tool: 'Indicadores de header y válvulas de aislamiento.',
  safety: 'Confirmar que hay suministro alternativo antes de aislar un header.',
  commonAlarms: [
    { cause: 'Presión/tensión fuera de rango', resolution: 'Ajustar fuente o reducir consumo; arrancar equipo standby.' },
  ],
};

const ELECTRICAL_SOURCE_DOC: ElementDoc = {
  title: 'Generador eléctrico',
  kind: 'Fuente de potencia',
  description: 'Genera energía eléctrica para el proceso y servicios esenciales.',
  usage: 'Mantener frecuencia y tensión dentro de límites. Arrancar carga escalonadamente.',
  tool: 'Panel de control del generador, interruptor de sincronismo.',
  safety: 'No cargar más allá de la capacidad. Priorizar cargas esenciales en subcarga.',
  commonAlarms: [
    { cause: 'Subfrecuencia / sobrecarga', resolution: 'Soltar cargas no esenciales; verificar combustible.' },
    { cause: 'Bajo voltaje', resolution: 'Ajustar regulador; reducir carga.' },
  ],
};

const COMPRESSOR_DOC: ElementDoc = {
  title: 'Motocompresor',
  kind: 'Equipo rotativo',
  description: 'Aumenta la presión del gas para su transporte o inyección. Puede operar en paralelo con otras unidades.',
  usage: 'Arrancar/parar según demanda. Monitorear presión de succión, descarga, temperatura y vibración.',
  tool: 'Panel de control del compresor, válvulas de succión/descarga y BDV.',
  safety: 'No arrancar con presión de succión negativa. Verificar antisurge y lubricación.',
  commonAlarms: [
    { cause: 'Alta presión de succión', resolution: 'Abrir SDV de descarga o ajustar setpoint de PIC.' },
    { cause: 'Baja presión de succión', resolution: 'Verificar aporte upstream; reducir caudal de compresión.' },
    { cause: 'Disparo de compresor', resolution: 'Revisar temperatura/vibración; rearrancar tras chequeo.' },
  ],
};

const CONTACTOR_DOC: ElementDoc = {
  title: 'Contactora de TEG',
  kind: 'Torre de absorción',
  description: 'Contacta gas húmedo con glicol (TEG) para reducir el contenido de agua y cumplir especificación de gas de venta.',
  usage: 'Ajustar caudal de gas con FIC. Monitorear caída de presión y nivel de TEG.',
  tool: 'FIC de caudal de gas, SDV de bypass/venta, bomba de circulación de TEG.',
  safety: 'No sobrepasar presión máxima de diseño. Asegurar sellado de TEG antes de abrir.',
  commonAlarms: [
    { cause: 'Alta presión de contactor', resolution: 'Abrir válvula de venta o disparar BDV.' },
    { cause: 'Baja presión de contactor', resolution: 'Verificar aporte desde compresor; cerrar venta si es necesario.' },
    { cause: 'Alto dP en lecho', resolution: 'Chequear saturación de TEG o contaminación.' },
  ],
};

const LIQUID_SEPARATOR_DOC: ElementDoc = {
  title: 'Separador de líquidos',
  kind: 'Vaso de separación',
  description: 'Separa gas libre remanente del líquido antes del almacenamiento o despacho.',
  usage: 'Mantener nivel estable con LIC. Drenar a tanques.',
  tool: 'Lazos de nivel, válvulas de drenaje y alivio.',
  safety: 'No permitir carry-over de gas al sistema de líquidos.',
  commonAlarms: [
    { cause: 'Alto nivel', resolution: 'Abrir válvula de salida a tanque.' },
    { cause: 'Muy alto nivel', resolution: 'Cerrar entrada y arrancar bomba de transferencia.' },
  ],
};

const STORAGE_TANK_DOC: ElementDoc = {
  title: 'Tanque de almacenamiento',
  kind: 'Tanque atmosférico',
  description: 'Almacena líquido estabilizado antes del despacho.',
  usage: 'Controlar inventario. Arrancar bombas de despacho según demanda.',
  tool: 'Medición de nivel, bombas de despacho.',
  safety: 'No llenar por encima del nivel alto alto. Venteo a atmósfera seguro.',
  commonAlarms: [
    { cause: 'Tanque lleno', resolution: 'Detener entrada; arrancar bomba de despacho.' },
    { cause: 'Tanque vacío', resolution: 'Parar bomba para no cavitar.' },
  ],
};

const PUMP_DOC: ElementDoc = {
  title: 'Bomba de despacho',
  kind: 'Bomba centrífuga',
  description: 'Envía líquido desde tanques al sistema de despacho.',
  usage: 'Arrancar/parar según nivel de tanque y demanda.',
  tool: 'Botón de arranque, válvulas de succión/descarga.',
  safety: 'No arrancar con válvula de descarga cerrada. Veritar sello y lubricación.',
  commonAlarms: [
    { cause: 'Bomba cavitando', resolution: 'Cerrar descarga y verificar nivel de succión.' },
  ],
};

const FUEL_GAS_SKID_DOC: ElementDoc = {
  title: 'Skid de gas combustible',
  kind: 'Sistema de utilidades',
  description: 'Acondiciona gas de proceso para alimentar quemadores, hornos y equipos de la planta.',
  usage: 'Regular presión y temperatura. Eliminar líquidos antes de la regulación final.',
  tool: 'Scrubber SB-006, calentador V-700, válvula reguladora PCV-700.',
  safety: 'Baja presión de gas combustible puede causar flame-out. Alto nivel en scrubber dispara el trip.',
  commonAlarms: [
    { cause: 'Baja presión en header de gas combustible', resolution: 'Abrir PCV-700 o verificar suministro desde proceso.' },
    { cause: 'Alto nivel en scrubber', resolution: 'Drenar líquidos y veritar funcionamiento del trap.' },
  ],
};

const SALES_GAS_DOC: ElementDoc = {
  title: 'Gas de venta',
  kind: 'Producto final',
  description: 'Gas seco listo para entrega a ducto de venta.',
  usage: 'Controlar caudal y calidad. Reportar ENAGAS.',
  tool: 'FIC de caudal, analizador de punto de rocío.',
  safety: 'Mantener presión dentro de especificación de transporte.',
  commonAlarms: [
    { cause: 'Bajo caudal de venta', resolution: 'Aumentar producción upstream o abrir segunda contactora.' },
  ],
};

const PIA_DOC: ElementDoc = {
  title: 'Planta de Inyección de Agua (PIA)',
  kind: 'Sistema de inyección',
  description: 'Toma agua, la trata y la inyecta a alta presión en el yacimiento para mantener presión y mejorar recuperación.',
  usage: 'Mantener presión de header y caudal de inyección. Alternar bombas. Monitorear filtros.',
  tool: 'Bombas de inyección, filtros, panel de control.',
  safety: 'No operar bombas con succión bloqueada. Purga de aire antes de arranque.',
  commonAlarms: [
    { cause: 'Presión baja de header', resolution: 'Arrancar bomba standby; revisar filtros y fugas.' },
    { cause: 'Caudal de inyección bajo', resolution: 'Verificar apertura de pozos de inyección; revisar bombas.' },
    { cause: 'Bomba trip', resolution: 'Confirmar causa; rearrancar o cambiar a standby.' },
  ],
};

const TEG_DOC: ElementDoc = {
  title: 'Planta de Deshidratación de Gas (TEG)',
  kind: 'Tratamiento de gas',
  description: 'Utiliza trietilenglicol para absorber el agua del gas húmedo y evitar la formación de hidratos en transporte.',
  usage: 'Mantener circulación de TEG y temperatura del regenerador. Controlar punto de rocío.',
  tool: 'Contactor, regenerador, bombas de glicol, rehervidor.',
  safety: 'El glicol caliente y bajo presión puede causar quemaduras. Evitar derrames.',
  commonAlarms: [
    { cause: 'Punto de rocío alto', resolution: 'Aumentar circulación de TEG; revisar temperatura de regenerador.' },
    { cause: 'Temperatura baja de regenerador', resolution: 'Aumentar fuego/duty del rehervidor; verificar combustible.' },
    { cause: 'Nivel alto en contactor', resolution: 'Aumentar bomba de glicol rico; revisar separador upstream.' },
  ],
};

const SINK_DOC: ElementDoc = {
  title: 'Punto de salida',
  kind: 'Destino',
  description: 'Destino del flujo: compresión, tratamiento, drenaje o carga.',
  usage: 'Monitorear condiciones de entrega.',
  tool: 'Medidores de entrega.',
  safety: 'Verificar que el destino pueda recibir el flujo antes de abrir válvulas.',
  commonAlarms: [],
};

const DEFAULT_DOC: ElementDoc = {
  title: 'Elemento de proceso',
  kind: 'Genérico',
  description: 'Componente del P&ID.',
  usage: 'Seleccionar para ver detalles.',
  tool: 'Herramienta según tipo.',
  safety: 'Seguir procedimientos operativos.',
  commonAlarms: [],
};

function matchDoc(tag: string): ElementDoc {
  const upper = tag.toUpperCase();

  if (upper.startsWith('WELL')) return WELL_DOC;
  if (upper === 'MANIFOLD') return MANIFOLD_DOC;
  if (upper.startsWith('SB-')) return VESSEL_DOC;
  if (upper.startsWith('TK-')) return TANK_DOC;
  if (upper.startsWith('FLARE')) return FLARE_DOC;
  if (upper.startsWith('COMPRESSION') || upper.startsWith('DRAIN')) return SINK_DOC;

  if (upper.startsWith('PV-') || upper.startsWith('LV-') || upper.startsWith('VT-')) return CONTROL_VALVE_DOC;
  if (upper.startsWith('SDV')) return SDV_DOC;
  if (upper.startsWith('XV')) return SDV_DOC;
  if (upper.startsWith('BDV')) return BDV_DOC;
  if (upper.startsWith('PSV')) return PSV_DOC;
  if (upper.startsWith('BYP') || upper.startsWith('V-IN') || upper.startsWith('V-OUT') || upper.startsWith('DR-') || /^V-\d+$/.test(upper))
    return MANUAL_VALVE_DOC;

  if (upper.startsWith('PT') || upper.startsWith('LT') || upper.startsWith('FT') || upper.startsWith('DP') || upper.startsWith('ΔP') || upper.startsWith('PSLL') || upper.startsWith('FSLL') || upper.startsWith('VOLT') || upper.startsWith('UF') || upper.startsWith('OF') || upper.startsWith('ZA'))
    return TRANSMITTER_DOC;

  if (upper.startsWith('PIC') || upper.startsWith('LIC') || upper.startsWith('FIC')) return CONTROLLER_DOC;

  if (upper.startsWith('IA-COMP')) return UTILITY_COMPRESSOR_DOC;
  if (upper.startsWith('CW-PUMP')) return UTILITY_PUMP_DOC;
  if (upper.includes('HEADER') || upper === 'FG-REG' || upper === 'MCC-001' || upper.startsWith('BUS'))
    return UTILITY_HEADER_DOC;
  if (upper.startsWith('GEN')) return ELECTRICAL_SOURCE_DOC;
  if (upper.startsWith('LOAD')) return SINK_DOC;
  if (upper.startsWith('FG-')) return { ...VESSEL_DOC, title: 'Recipiente de fuel gas' };
  if (upper.startsWith('IA-RECV')) return { ...VESSEL_DOC, title: 'Receiver de aire comprimido' };
  if (upper.startsWith('KG-')) return COMPRESSOR_DOC;
  if (upper.startsWith('TC-')) return CONTACTOR_DOC;
  if (upper.startsWith('ST-')) return LIQUID_SEPARATOR_DOC;
  if (upper.startsWith('TKAG-')) return STORAGE_TANK_DOC;
  if (upper.startsWith('BA-')) return PUMP_DOC;
  if (upper === 'SALES-GAS') return SALES_GAS_DOC;
  if (upper.startsWith('FG-') || upper === 'SB-006' || upper === 'V-700' || upper === 'PCV-700') return FUEL_GAS_SKID_DOC;
  if (upper.startsWith('PIA-') || upper.startsWith('PSLL-PIA') || upper.startsWith('FSLL-PIA') || upper.startsWith('ZA-PIA')) return PIA_DOC;
  if (upper.startsWith('TEG-') || upper.startsWith('TAHH-TEG') || upper.startsWith('TALL-TEG') || upper.startsWith('LAHH-TEG') || upper.startsWith('ZA-TEG')) return TEG_DOC;

  return DEFAULT_DOC;
}

export function getElementDoc(tag: string): ElementDoc {
  return matchDoc(tag);
}
