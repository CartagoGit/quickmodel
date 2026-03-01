# internals/

Documentación técnica interna del proyecto QuickModel. **No se publica en la web.**

Similar a `proposals/` (decisiones pendientes), esta carpeta contiene la documentación consolidada de decisiones de diseño, mecanismos internos y arquitectura de componentes ya implementados.

## Índice

| Fichero                                      | Describe                                                                                                                                                                         |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [AGENT-COORDINATE.md](./AGENT-COORDINATE.md) | Sistema de coordinación entre agentes AI paralelos: registry JSON, lock atómico cross-proceso, ticker de limpieza, TTL, heartbeat implícito y detección de conflictos glob-aware |

## Cuándo añadir un documento aquí

- Cuando un mecanismo interno es lo suficientemente complejo para que otro desarrollador (o agente AI) pierda tiempo entendiéndolo sin documentación
- Cuando hay decisiones de diseño no obvias que deben estar justificadas (p. ej. "por qué un lock file y no un mutex en memoria")
- Cuando el código tiene comportamientos que dependen de la interacción entre varias clases o ficheros
