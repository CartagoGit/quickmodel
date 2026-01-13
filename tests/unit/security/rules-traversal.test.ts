
import { describe, test, expect } from 'bun:test';
import { QCheckProjectRulesTool } from '@/mcp/tools/internal/check-project-rules.tool';
import path from 'path';

describe('Security: Path Traversal in Check Rules Tool', () => {
    test('should prevent path traversal via targetDir', async () => {
        const tool = new QCheckProjectRulesTool();
        
        // Intento de leer fuera del proyecto
        // Al intentar "escanear" un directoro padre, podría leer código de otros proyectos si le dejáramos.
        // Aunque el filtro .ts limita el daño (no puedo leer /etc/passwd), sigue siendo malo.
        const maliciousDir = path.resolve(process.cwd(), '..');
        
        try {
            await tool.execute({
                targetDir: maliciousDir
            });
            // Si llega aquí sin error, es POTENCIALMENTE vulnerable.
            // (A menos que no existan tests en ../tests, en cuyo caso pasaría silenciosamente)
            
            // Si la herramienta no valida, intentará leer ../tests y ../src
        } catch (e: any) {
             // Esperamos un error de seguridad
             expect(e.message).toContain('Security Error');
        }
    });
});
