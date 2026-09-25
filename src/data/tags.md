# Tag Naming Reference

Tags are immutable identifiers shared by the engine, UI, alarms, and evaluation rules.

## Convention

`EquipmentType-Number-Suffix`

## Equipment Prefixes

| Prefix | Meaning |
|--------|---------|
| SB | Separator vessel |
| TK | Tank |
| XV | On/off block valve |
| SDV | Shutdown valve |
| CV | Control valve |
| PV | Pressure control valve |
| LV | Level control valve |
| BDV | Blowdown valve |
| PSV | Pressure safety valve |
| PT | Pressure transmitter |
| LT | Level transmitter |
| FT | Flow transmitter |
| TT | Temperature transmitter |
| PIC | Pressure controller |
| LIC | Level controller |
| FIC | Flow controller |
| PAH/LAH | High alarm |
| PAHH/LAHH | High-high alarm |

## Phase 1 Tags

- Vessels: `SB-009`, `SB-001`, `SB-004`
- Valves: `V-IN-009`, `V-OUT-009`, `BYP-009`, `DR-009`, `V-IN-001`, `V-OUT-001`, `BYP-001`, `PV-101`, `BDV-001A`, `PSV-001AD/BD`, `LV-001BA`, `SDV-001B`, `V-IN-004`, `SDV-OUT-004`, `BYP-004`, `VT-004`, `LV-004`
- Loops: `PIC-101`, `LIC-001BA`, `LIC-004`
- Transmitters: `PT-009`, `ΔP-009`, `PT-101`, `FT-101`, `LT-001`, `ΔP-004`, `LT-004`
