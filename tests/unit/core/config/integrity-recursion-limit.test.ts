import { QModel } from '@/core/models/quick.model';
import { Quick } from '@/core/decorators/quick.decorator';
import { QConfig } from '@/core/config/quick.config';

describe('Integrity: Recursion Limit', () => {
    beforeEach(() => {
        QConfig.configure({
            defaults: {
                maxRecursionDepth: undefined
            }
        });
    });

    it('should allow recursion within default limit (50)', () => {
        QConfig.configure({ defaults: { maxRecursionDepth: 5 } });

        @Quick({ next: Node })
        class Node extends QModel<any> {
            declare next?: Node;
        }

        // Create a chain of depth 4 (should pass)
        // Root (0) -> Next (1) -> Next (2) -> Next (3) -> Next (4) -> {} (5)
        const data = {
            next: {
                next: {
                    next: {
                        next: {}
                    }
                }
            }
        };

        const node = Node.create(data);
        expect(node.next!.next!.next!.next).toBeDefined();
    });

    it('should throw error when recursion depth exceeded', () => {
        QConfig.configure({ defaults: { maxRecursionDepth: 3 } });

        @Quick({ next: Node })
        class Node extends QModel<any> {
            declare next?: Node;
        }

        // Depth > 3
        const data = {
            next: {
                next: {
                    next: {
                        next: {}
                    }
                }
            }
        };

        expect(() => {
            Node.create(data);
        }).toThrow(/Maximum recursion depth \(3\) exceeded/);
    });

    it('should respect default limit of 50', () => {
        @Quick({ next: Node })
        class Node extends QModel<any> {
            declare next?: Node;
        }

        // Generate deep object > 50 levels
        let data: any = {};
        let current = data;
        for (let i = 0; i < 55; i++) {
            current.next = {};
            current = current.next;
        }

        expect(() => {
            Node.create(data);
        }).toThrow(/Maximum recursion depth \(50\) exceeded/);
    });
});
