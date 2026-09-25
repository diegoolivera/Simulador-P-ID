# Storbrain — Simulador Profesional de Baterista / Recorredor de Pozo

> **Storbrain** = *story + brain*: documento de pensamiento estructurado que define la historia de usuario, el recorrido pedagógico y la arquitectura funcional del simulador antes de escribir código.
> 
> Basado en el apunte *"Baterista - Recorredor de Pozo"* (Obsidian) y en el simulador `simuladorEquipos.html` existente.

---

## 1. Visión del producto

**Qué es:** un simulador SCADA interactivo de una batería de tratamiento de gas y líquidos, diseñado para que operadores de campo (bateristas, recorredores de pozo, pumper, well tender) practiquen rutinas, diagnósticos y procedimientos de emergencia sin riesgo real.

**Diferencial:** no es solo un P&ID animado. Es una **plataforma de entrenamiento** que combina:

- Física de proceso simplificada pero consistente.
- Rondas de campo guiadas con checklist.
- Sistema de evaluación basado en decisiones correctas.
- Escenarios dinámicos de falla y emergencia.
- Modo instructor y modo autónomo.

**Métrica de éxito:** el usuario debe poder tomar un turno completo, desde mirar PI hasta responder un ESD1, pasando por LOTO, purgas y camión cisterna, y recibir una devolución de qué hizo bien y qué mal.

---

## 2. Público objetivo y objetivos de aprendizaje

### Perfiles

1. **Operador trainee**: nunca estuvo en una batería. Necesita aprender nombres, ubicaciones y secuencias.
2. **Baterista en formación**: ya conoce equipos, necesita practicar procedimientos y emergencias.
3. **Instructor / supervisor**: quiere evaluar, crear escenarios y ver trazabilidad de errores.
4. **Autodidacta**: repasa para examen o certificación.

### Objetivos de aprendizaje (LO)

| ID | Objetivo | Módulo del apunte |
|----|----------|-------------------|
| LO-01 | Interpretar presiones, niveles, caudales y alarmas en una pantalla tipo PI. | 11, 13 |
| LO-02 | Realizar una ronda de campo priorizando equipos críticos. | 13 |
| LO-03 | Operar válvulas en secuencia correcta (arranque/paro de pozo, bypass, LOTO). | 6, 11, 18, 25 |
| LO-04 | Gestionar niveles de tanques manteniendo ullage seguro. | 13 |
| LO-05 | Ejecutar procedimientos LOTO sobre separadores y vasijas. | 18, 25 |
| LO-06 | Responder ante ESD1, ESD2 y ESD3 según la matriz causa-efecto. | 24 |
| LO-07 | Operar el sistema de gas combustible y su scrubber. | 12 |
| LO-08 | Mantener el aire de instrumentos dentro de 8.5–11 kg/cm². | 14 |
| LO-09 | Arrancar, operar y proteger un grupo electrógeno a gas. | 15 |
| LO-10 | Operar una planta inyectora de agua (PIA) con bombas reciprocantes. | 16 |
| LO-11 | Gestionar sumideros y purgas periódicas sin riesgo. | 17 |
| LO-12 | Cargar/descargar un camión cisterna con PAT, calzas y purga. | 19 |
| LO-13 | Encender y operar un flare con llama viajera y K.O. drum. | 20 |
| LO-14 | Controlar calidad de gas: agua <65 mg/Sm³ y punto de rocío HC. | 21 |
| LO-15 | Operar calentadores con damper y detector de llama. | 22 |
| LO-16 | Operar una planta de deshidratación con TEG y regenerar glicol. | 23 |
| LO-17 | Diagnosticar fallas en motocompresores. | 27 |
| LO-18 | Usar válvulas Abac y colectores de purga correctamente. | 26 |

---

## 3. Límites de la simulación (scope)

### Dentro del scope (fase 1)

- Batería con 3 pozos productores de gas/condensado.
- Colector de ingreso/manifold (70–90 kg/cm²).
- Tren de separación: desarenador (SB-009), slug catcher (SB-001), scrubber (SB-004).
- Líneas de bypass por cada equipo.
- Lazos de control PIC, LIC, FIC.
- Sistema ESD1/2/3 con matriz causa-efecto editable.
- Flare con K.O. drum y llama viajera.
- Tanques de líquidos y gestión de ullage.
- Sumidero/drain pit con purgas programadas.
- Camión cisterna con checklist de carga.
- LOTO interactivo sobre SB-009, SB-001 y SB-004.
- Rondas de campo con checklist.
- PI System / panel de alarmas.

### Fuera del scope inicial (roadmap futuro)

- Fuel gas system completo con scrubber y consumidores.
- Aire de instrumentos con compresor + pulmón.
- Generador a gas (HG) con acople de carga.
- Planta inyectora de agua (PIA).
- Planta de deshidratación TEG con reboiler.
- Calentadores indirectos con damper y detector de llama.
- Motocompresores con sistema de lubricación.
- Análisis de gas en laboratorio.
- Multiplayer / modo instructor remoto.

---

## 4. Flujo de proceso conceptual (PFD)

```text
Pozo 1 ──┐
Pozo 2 ──┼──► Manifold de ingreso ──► SB-009 (desarenador) ──► SB-001 (slug catcher)
Pozo 3 ──┘       70-90 kg/cm²                                 │
                                                                ▼
                                                         SB-004 (scrubber)
                                                                │
                                                                ▼
                                                    Gas a compresión / venta
                                                                │
                                                                ▼
                                                    Condensado ──► TK-101
                                                    Agua ───────► Drain pit / PIA

Servicios auxiliares:
- Fuel gas system (toma de salida de planta)
- Aire de instrumentos (compresor A/B + pulmón 8.5-11 kg/cm²)
- Generador a gas (HG)
- Flare (con K.O. drum)
- TEG (roadmap)
```

---

## 5. Arquitectura del simulador

### 5.1 Capas

```text
┌─────────────────────────────────────────┐
│  UI / Vistas (SCADA, PI, Ronda, LOTO)   │  React / Vue / vanilla + SVG
├─────────────────────────────────────────┤
│  Lógica de escenario y gamificación     │  Máquina de estados + evaluador
├─────────────────────────────────────────┤
│  Motor de física de proceso             │  Ecuaciones de balance
├─────────────────────────────────────────┤
│  Modelo de planta (P&ID + equipos)      │  JSON / grafo de nodos
├─────────────────────────────────────────┤
│  Persistencia y telemetría              │  LocalStorage / backend ligero
└─────────────────────────────────────────┘
```

### 5.2 Modelo de planta como grafo

Cada equipo y cada tramo de cañería es un nodo con:

- `id`, `tipo`, `nombre`, `tags`.
- `conexiones_entrada[]`, `conexiones_salida[]`.
- `estado`: presión, temperatura, nivel, composición.
- `equipos_asociados[]`: válvulas, instrumentos, bombas.

Esto permite calcular el flujo recorriendo el grafo en lugar de hardcodear ecuaciones por tramo.

### 5.3 Motor de física

Cada tick (por ejemplo 400 ms = 1 "segundo simulado") se resuelve:

1. **Topología**: qué caminos están abiertos según estado de válvulas.
2. **Balance de masa**: entra = sale + acumulación.
3. **Balance de presión**: caídas por fricción, ΔP en equipos, válvulas de control.
4. **Separación de fases**: gas, líquido, sólidos en cada recipiente.
5. **Transferencia de calor**: si aplica (calentadores, TEG).
6. **Control**: lazos PID/PI simples actualizan válvulas en modo auto.
7. **Seguridad**: se evalúan condiciones ESD y se disparan acciones.

### 5.4 Máquina de estados del simulador

```text
INICIO
  │
  ▼
SIMULACIÓN NORMAL  ◄─────────────┐
  │                              │
  ├──► RONDA DE CAMPO            │
  ├──► PROCEDIMIENTO LOTO        │
  ├──► CAMIÓN CISTERNA           │
  ├──► EMERGENCIA (ESD1/2/3)     │
  │                              │
  └──► PAUSA / RESET ────────────┘
```

---

## 6. Entidades principales

### 6.1 Pozos

Cada pozo tiene:

- Presión de reservorio (declinante con el tiempo).
- Caudal máximo disponible.
- Choke ajustable (0–100%).
- Lift: natural, BCP, BES, gas lift (fase 2).
- Alarmas: baja presión, alto gasto, parada.

### 6.2 Manifold / colector

- Presión objetivo: 70–90 kg/cm².
- Alarmas PSH / PSL.
- Válvulas de aislamiento por pozo y bypass.

### 6.3 Separadores

| Equipo | Función | Variables clave | LOTO posible |
|--------|---------|-----------------|--------------|
| SB-009 Desarenador | Retiene arena y sólidos | Nivel de arena, ΔP, presión | Sí |
| SB-001 Slug Catcher | Atrapa slugs de líquido | Nivel líquido, presión, caudal gas | Sí |
| SB-004 Scrubber | Elimina aerosoles con demister | ΔP demister, nivel líquido, presión | Sí |

### 6.4 Tanques

- TK-101: condensado.
- TK-201: agua de formación.
- Nivel objetivo: bajo dentro de lo operativo (mantener ullage).
- Alarmas LAH / LAHH.

### 6.5 Flare

- K.O. drum con nivel.
- Piloto encendido/apagado.
- Llama viajera con secuencia: piloto → ignición → detector confirma → principal.
- Regla: no operar planta sin flare prendido.

### 6.6 Servicios auxiliares (fase 2)

- Fuel gas header con scrubber.
- Aire de instrumentos: compresor A/B + pulmón 8.5–11 kg/cm².
- Grupo electrógeno a gas: 50 Hz, breaker, niveles.
- TEG: torre contactora, reboiler 180–200°C, filtros con ΔP.

### 6.7 Arquitectura de válvulas (interfaz crítica del operador)

Las válvulas son el punto de contacto más frecuente entre el baterista y el proceso. El simulador debe modelarlas con suficiente rigor como para que una apertura/cierre incorrecto genere consecuencias realistas.

#### 6.7.1 Tipos de válvulas a modelar

| Tipo | Símbolo típico | Función | Ejemplos en planta |
|------|----------------|---------|--------------------|
| **Bloqueo manual ON/OFF** | Esfera / compuerta | Aislar o habilitar tramos de proceso. | V-IN-009, V-OUT-001, SDV-001B |
| **Válvula de control (throttling)** | Globo con actuador | Regular caudal, presión o nivel variando apertura 0–100%. | PV-101, LV-001BA, LV-004 |
| **Choke / estranguladora** | Aguja / estrangulador | Controlar el gasto de producción desde el pozo. | Choke Pozo 1, 2, 3 |
| **SDV (Shutdown Valve)** | Esfera con actuador | Cierre de emergencia por ESD. | SDV-OUT-004, SDV entrada planta |
| **BDV (Blowdown Valve)** | Esfera con actuador | Despresurización a flare. | BDV-001A |
| **PSV (Pressure Safety Valve)** | Válvula de seguridad | Alivio automático por sobrepresión. | PSV-001AD/BD |
| **Solenoides** | Válvula pequeña de gas/aire | Habilitar gas piloto, gas principal o señales neumáticas. | Solenoide piloto calentador |
| **Válvula Abac / Block & Bleed** | Bloque de 2–5 vías | Aislar, ventear y calibrar instrumentos. | Manifold de PT, LT, ΔP |
| **Check / retención** | Válvula de retención | Permite flujo en un solo sentido. | Líneas de bomba, tanques |

#### 6.7.2 Actuación y modo de falla (fail position)

Cada válvula automática debe tener definido:

- **Actuación:** manual, neumática (ATO / ATC), eléctrica, hidráulica.
- **Fail position:** qué hace si pierde la señal de control o energía.
  - **FC (Fail Close):** cierra. Típica en entradas de proceso y SDV.
  - **FO (Fail Open):** abre. Típica en BDV y venteos de seguridad.
  - **FL (Fail Last):** mantiene última posición. Algunas válvulas de control.
- **Tiempo de carrera:** cuántos segundos tarda en ir de 0 a 100%.

#### 6.7.3 Modelo de estado de una válvula

```typescript
interface Valve {
  id: string;
  tag: string;
  type: 'manual' | 'control' | 'sdv' | 'bdv' | 'psv' | 'solenoid' | 'abac' | 'check';
  actuation: 'manual' | 'pneumatic' | 'electric' | 'hydraulic';
  failPosition: 'FC' | 'FO' | 'FL';
  position: number;        // 0.0 – 1.0
  targetPosition: number;  // para animar carrera
  strokeTime: number;      // segundos de 0 a 100%
  isOpen: boolean;         // umbral operativo (ej. > 2%)
  isLocked: boolean;       // LOTO o interlock
  leakage: number;         // 0.0 – 0.05 (fugas cuando cerrada)
  commandedBy: 'operator' | 'loop' | 'esd' | 'safety' | null;
}
```

#### 6.7.4 Comportamiento dinámico

- **Carrera no instantánea:** una SDV no cierra en un frame; tarda 2–10 s. Eso importa en emergencias.
- **Fugas:** una válvula "cerrada" puede tener fuga mínima que permita equilibrar presiones lentamente.
- **Cavitación/erosión:** si se estrangula demasiado un líquido con alta ΔP, se puede modelar desgaste (fase avanzada).
- **Histeresis:** una válvula de control no responde exactamente al 1%; puede tener zona muerta.

#### 6.7.5 Prioridad de comandos

Cuando varios sistemas piden algo a la vez, se aplica esta prioridad:

1. **LOTO físico / candado:** bloquea cualquier comando.
2. **ESD / seguridad:** override absoluto.
3. **Interlock de proceso:** por ejemplo, no abrir gas principal sin detector de llama.
4. **Lazo de control automático:** ajusta posición en modo AUTO.
5. **Operador manual:** última prioridad cuando no hay condiciones de seguridad.

#### 6.7.6 Representación visual

- **Colores:** verde = abierta, rojo = cerrada, amarillo = parcial, gris = desconocida/bloqueada.
- **Animación:** vástago o actuador que se mueve durante la carrera.
- **Etiqueta:** tag + porcentaje (si es de control) + modo (AUTO/MAN).
- **Resaltado LOTO:** borde punteado celeste cuando la válvula es parte del paso actual.
- **Tooltip:** tipo, actuación, fail position, estado, quién la comandó.

#### 6.7.7 Eventos auditables por válvula

Cada acción se registra:

- Quién/qué la comandó (operador, lazo, ESD).
- Posición anterior y nueva.
- Timestamp.
- Si violó una secuencia de seguridad.

Esto permite al evaluador decir cosas como: *"Cerraste V-IN-009 antes de abrir BYP-009: eso interrumpe el flujo y puede disparar PSL"*.

---

## 7. Sistemas de control e instrumentación

### 7.1 Instrumentos simulados

| Tag | Tipo | Función |
|-----|------|---------|
| PT | Presión | Manómetro digital y alarma |
| LT | Nivel | Indicación % y alarmas LAL/LAH/LAHH |
| FT | Caudal | Totalizador y tendencia |
| ΔP | Diferencial | Aviso de taponamiento |
| TT | Temperatura | Alarmas TAH/TAL |
| PIC | Control presión | Modo auto/man con SP ajustable |
| LIC | Control nivel | Modo auto/man con SP ajustable |
| FIC | Control caudal | Modo auto/man con SP ajustable |
| PSH/PSL | Switch presión | Disparo de alarmas/ESD |
| LSH/LSL | Switch nivel | Disparo de alarmas/ESD |

### 7.2 Lazos de control

- **PIC-101**: controla presión en SB-001 actuando sobre PV-101.
- **LIC-001BA**: controla nivel líquido en SB-001 actuando sobre LV-001BA (+ SDV-001B en serie).
- **LIC-004**: controla nivel líquido en SB-004 actuando sobre LV-004.
- **PIC-009**: controla presión manifold (futuro).

### 7.3 Sistema ESD

Matriz causa-efecto editable por el instructor. Ejemplo base:

| Causa | ESD1 | ESD2 | ESD3 | Cierre SDV | BDV | Paro HG |
|-------|------|------|------|------------|-----|---------|
| Botón de pánico | Sí | Sí | Sí | Sí | Sí | Sí |
| Fuego confirmado | Sí | No | No | Sí | Sí | Sí |
| Fuga masiva gas | Sí | No | No | Sí | Sí | Sí |
| Corte energía general | No | Sí | No | Sí | No | No |
| Falta aire instrumentos | No | Sí | No | Sí | No | No |
| Alto nivel scrubber | No | No | Sí | Local | No | No |
| Alta presión SB-001 HIHI | No | No | Sí | Local | No | No |

---

## 8. Modos de operación del usuario

### 8.1 Modo Libre

El usuario opera sin guía. Sirve para explorar y entender caus-efecto.

### 8.2 Modo Turno / Ronda

Se le presenta una consigna: *"Es el inicio de tu turno. Revisá PI, hacé la ronda y reportá las novedades."*

Pasos:

1. Mirar pantalla PI.
2. Salir a ronda virtual (clickear equipos en orden lógico).
3. Completar checklist por equipo.
4. Tomar decisiones: ajustar choke, purgar, llamar mantenimiento.
5. Recibir feedback.

### 8.3 Modo Procedimiento

Escenarios guiados paso a paso:

- Arranque de pozo.
- Paro de pozo.
- LOTO de separador.
- Carga de camión cisterna.
- Encendido de flare.
- Cambio de filtros de TEG (fase 2).

### 8.4 Modo Emergencia

El simulador inyecta una falla y el usuario debe responder:

- Llegada de slug masivo.
- Saturación de arena.
- Disparo ESD1.
- Falla de aire de instrumentos.
- Apagón eléctrico.
- Fuga de H₂S.

### 8.5 Modo Instructor

Permite configurar:

- Setpoints iniciales.
- Escenarios activos.
- Velocidad de simulación.
- Qué variables mostrar/ocultar.
- Criterios de evaluación.

---

## 9. Escenarios pedagógicos detallados

### Escenario A — Inyección de slug masivo

**Disparador:** llega un slug de líquido al SB-001.
**Objetivo:** evitar LAHH en SB-001 y no disparar ESD3.
**Acciones correctas:**

1. Anticipar mirando tendencia de FT-101.
2. Aumentar SP de LIC-001BA para drenar más líquido.
3. Verificar que SDV-001B esté abierto.
4. Si se acerca a LAHH, reducir choke de pozos o abrir bypass.

### Escenario B — Saturación de arena en SB-009

**Disparador:** alto ingreso de arena.
**Objetivo:** evitar ΔP alto y mantener producción.
**Acciones correctas:**

1. Alinear bypass SB-009.
2. Cerrar V-IN-009 y V-OUT-009.
3. Purgar arena con DR-009 (a baja presión).
4. Volver a poner en servicio lentamente.

### Escenario C — Disparo ESD1

**Disparador:** fuego confirmado o botón de pánico.
**Objetivo:** responder correctamente y luego reiniciar seguro.
**Acciones correctas:**

1. Confirmar cierre de SDV de entrada y salida.
2. Confirmar apertura de BDV/venteos.
3. No resetear hasta que no haya alarmas activas.
4. Recorrida de verificación post-ESD.
5. Reinicio por secuencia inversa (venteos cerrados → raíz → entrada lenta).

### Escenario D — Procedimiento LOTO

**Objetivo:** aislar un separador para mantenimiento.
**Pasos obligatorios:**

1. Abrir bypass al 100%.
2. Cerrar válvulas de bloqueo.
3. Despresurizar a antorcha hasta ~5 kg/cm².
4. Drenar líquidos.
5. Despresurizar a 0.
6. Abrir venteo.
7. Colocar candados y etiquetas.
8. Completar Anexo 1.

### Escenario E — Carga de camión cisterna

**Objetivo:** retirar agua/condensado sin incidentes.
**Secuencia obligatoria:**

1. Calzar ruedas.
2. Colocar matafuego a 3–4 m.
3. Conectar PAT.
4. Encastrar acople rápido.
5. Abrir válvula de cisterna.
6. Arrancar bomba de vacío.
7. Al finalizar: cerrar válvula, parar bomba, purgar manguera, desacoplar.

### Escenario F — Falla de aire de instrumentos

**Disparador:** pulmón baja de 8.5 kg/cm².
**Efecto:** válvulas de control pierden fuerza, SDV tienden a fail-close.
**Acciones:** arrancar compresor standby, reducir producción, vigilar niveles.

### Escenario G — Calidad de gas fuera de especificación

**Disparador:** agua >65 mg/Sm³ o punto de rocío alto.
**Acciones:** aumentar regeneración TEG, revisar filtros, ajustar temperatura reboiler.

---

## 10. Sistema de evaluación

### 10.1 Eventos auditables

Cada acción del usuario se registra con timestamp:

- Apertura/cierre de válvula.
- Cambio de SP o modo de lazo.
- Inicio/fin de LOTO.
- Purga manual.
- Ajuste de choke.
- Respuesta a alarma.
- Decisión de reset ESD.

### 10.2 Reglas de evaluación

```json
{
  "rule_id": "loto_bypass_first",
  "description": "Antes de cerrar válvulas de bloqueo, el bypass debe estar abierto al 100%",
  "severity": "CRITICAL",
  "check": "state.valves.vbp009.pct >= 90 BEFORE state.valves.vin009.open == false"
}
```

### 10.3 Puntuación por turno

- **Seguridad**: no violar LOTO, no operar sin flare, PAT obligatoria.
- **Proceso**: mantener variables dentro de rangos operativos.
- **Eficiencia**: minimizar gas quemado en flare, mantener producción.
- **Tiempo**: resolver emergencias dentro de ventanas razonables.

### 10.4 Reporte final

Al terminar un turno o escenario, mostrar:

- Alarmas activas generadas por el usuario.
- Acciones correctas e incorrectas con referencia a procedimiento.
- Tiempo de respuesta.
- Recomendaciones de estudio.

---

## 11. UI/UX: vistas y pantallas

### 11.1 Pantalla principal (SCADA)

- P&ID completo con SVG interactivo.
- Válvulas clickeables con tooltip.
- Doble-click en válvulas de control para ajustar %.
- Animación de flujo (gas, líquido, sólidos).
- Colores por estado: normal, advertencia, alarma, ESD.

### 11.2 Panel tipo PI System

- Tabla de variables con tendencia mini.
- Filtros por área (proceso, servicios auxiliares, tanques).
- Alarmas activas ordenadas por prioridad.
- Botón "Ir a ronda" que marca equipos a inspeccionar.

### 11.3 Panel de ronda de campo

- Lista de equipos a verificar.
- Checklist por equipo con ítems aleatorios o fijos.
- Fotos/esquemas de referencia.
- Registro de hallazgos.

### 11.4 Panel de procedimientos

- Wizard paso a paso para LOTO, arranque de pozo, camión cisterna, etc.
- Validación de condiciones antes de avanzar.
- Simulación de Anexo 1 con campos a completar.

### 11.5 Panel de emergencia

- Banner ESD con nivel y causa.
- Botones de respuesta rápida.
- Contador de tiempo desde el evento.

### 11.6 Panel de aprendizaje

- Tarjetas de conceptos por módulo.
- Preguntas de repaso interactivas.
- Enlaces a secciones del apunte.

---

## 12. Stack tecnológico recomendado

### Opción A: Single-file, sin build (evolución del actual)

- HTML5 + CSS3 + JavaScript vanilla.
- SVG para P&ID.
- LocalStorage para progreso.
- Vite opcional para desarrollo.

**Pros:** fácil de abrir, cero dependencias, portable.
**Contras:** difícil de escalar a muchos módulos.

### Opción B: Aplicación web moderna (recomendado para profesional)

- **Framework:** React 18+ o Vue 3.
- **Gráficos:** SVG nativo + biblioteca de diagramas (React Flow / GoJS) si se complica.
- **Estado:** Zustand / Redux Toolkit / Pinia.
- **Física:** motor propio en TypeScript, posiblemente worker para no bloquear UI.
- **Persistencia:** IndexedDB + backend opcional (Node/Express o Firebase).
- **Tests:** Vitest + React Testing Library / Playwright.

**Recomendación:** empezar con **Opción A** para validar la mecánica y luego migrar a **Opción B** cuando se agreguen servicios auxiliares y evaluación.

---

## 13. Roadmap de desarrollo

### Fase 0 — Fundamentos (2–3 semanas)

- Refactorizar `simuladorEquipos.html` a estructura modular.
- Modelo de planta como grafo de nodos.
- Motor de física con balance de masa/presión.
- P&ID SVG más limpio y navegable.
- Sistema de alarmas robusto.

### Fase 1 — Proceso principal (3–4 semanas)

- Pozo + manifold + tren de separación completo.
- Lazos de control PIC/LIC/FIC.
- ESD1/2/3 con matriz editable.
- Flare con K.O. drum.
- Tanques y gestión de ullage.
- Sumidero y purgas programadas.
- LOTO interactivo sobre 3 separadores.
- Rondas de campo con checklist.
- Sistema de evaluación básico.

### Fase 2 — Servicios auxiliares (3–4 semanas)

- Fuel gas system.
- Aire de instrumentos (compresor A/B + pulmón).
- Generador a gas (HG) con acople.
- Camión cisterna con checklist completo.

### Fase 3 — Procesos avanzados (4–6 semanas)

- Planta inyectora de agua (PIA).
- Deshidratación TEG con reboiler y filtros.
- Calentadores con damper y detector de llama.
- Motocompresores.

### Fase 4 — Pedagogía y pulido (continuo)

- Modo instructor.
- Reportes detallados.
- Preguntas de repaso por módulo.
- Escenarios aleatorios.
- Posible exportación a LMS.

---

## 14. Riesgos y consideraciones

| Riesgo | Mitigación |
|--------|------------|
| Física demasiado simplificada y poco creíble | Documentar supuestos, validar con ingeniero senior, usar rangos realistas. |
| Scope que crece indefinidamente | Congelar fases, priorizar LO más importantes. |
| UI saturada de información | Vistas separadas, modos de dificultad, mostrar/ocultar tags. |
| Evaluación injusta o poco clara | Reglas explícitas, retroalimentación por cada error. |
| Dificultad para no técnicos | Tutorial introductorio, tooltips extensos, modo asistido. |
| Mantenimiento del código monolítico | Migrar a componentes/modularización desde fase 0. |

---

## 15. Próximos pasos inmediatos

1. **Validar este storbrain** con el usuario (¿falta algún módulo? ¿prioridad diferente?).
2. **Elegir stack:** ¿seguimos con single-file o saltamos a framework?
3. **Definir el P&ID definitivo** con todos los tags de fase 1.
4. **Diseñar la matriz causa-efecto ESD** base.
5. **Implementar fase 0** (refactor + motor de física).
6. **Probar escenarios A, B, C, D** antes de agregar servicios auxiliares.

---

> **Nota para el desarrollador:** este documento es la entrada de diseño. Cada decisión de modelado físico, cada tag de instrumento y cada secuencia de procedimiento debe poder rastrearse hasta un objetivo de aprendizaje (LO) del punto 2. Si una funcionalidad no apoya un LO, se pospone a roadmap futuro.
