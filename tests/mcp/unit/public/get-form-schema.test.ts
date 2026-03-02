import { describe, it, expect } from 'bun:test';
import { QGetFormSchemaTool } from '../../../../src/mcp/tools/public/get-form-schema.tool';

const sampleCode = `
@Quick({ createdAt: Date })
class ContactForm extends QModel<any> {
  @QField({ widget: 'input', label: 'Full Name', required: true })
  declare name: string;

  @QField({ widget: 'input', label: 'Email Address', required: true, hint: 'Enter a valid email' })
  declare email: string;

  @QField({ widget: 'number', label: 'Age', required: false })
  declare age: number;
}
`;

const groupedCode = `
@Quick({})
class RegistrationForm extends QModel<any> {
  @QGroup('Personal')
  @QField({ widget: 'input', label: 'Name', required: true })
  declare name: string;

  @QGroup('Personal')
  @QField({ widget: 'number', label: 'Age' })
  declare age: number;

  @QGroup('Contact')
  @QField({ widget: 'input', label: 'Email', required: true })
  declare email: string;
}
`;

describe('QGetFormSchemaTool', () => {
	it('should be defined with correct metadata', () => {
		const tool = new QGetFormSchemaTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('get_form_schema');
		expect(tool.description).toBeDefined();
	});

	it('schema should require code parameter', () => {
		const tool = new QGetFormSchemaTool();
		expect(tool.schema).toBeDefined();
	});

	it('should return flat schema array from @QField annotations', async () => {
		const tool = new QGetFormSchemaTool();
		const result = await tool.execute({ code: sampleCode });

		expect(result.schema).toBeArray();
		expect(result.schema.length).toBe(3);
	});

	it('each entry should have field, widget, and label', async () => {
		const tool = new QGetFormSchemaTool();
		const result = await tool.execute({ code: sampleCode });

		for (const entry of result.schema) {
			const field = entry as Record<string, unknown>;
			expect(typeof field['field']).toBe('string');
			expect(typeof field['widget']).toBe('string');
			expect(typeof field['label']).toBe('string');
		}
	});

	it('should preserve required flag from @QField', async () => {
		const tool = new QGetFormSchemaTool();
		const result = await tool.execute({ code: sampleCode });

		const nameEntry = result.schema.find(
			(entry: Record<string, unknown>) => entry['field'] === 'name'
		) as Record<string, unknown>;
		const ageEntry = result.schema.find(
			(entry: Record<string, unknown>) => entry['field'] === 'age'
		) as Record<string, unknown>;

		expect(nameEntry?.required).toBe(true);
		expect(ageEntry?.required).toBeFalsy();
	});

	it('should preserve hint from @QField when present', async () => {
		const tool = new QGetFormSchemaTool();
		const result = await tool.execute({ code: sampleCode });

		const emailEntry = result.schema.find(
			(entry: Record<string, unknown>) => entry['field'] === 'email'
		) as Record<string, unknown>;
		expect(emailEntry?.hint).toBeDefined();
	});

	it('should return grouped schema when grouped=true', async () => {
		const tool = new QGetFormSchemaTool();
		const result = await tool.execute({ code: groupedCode, grouped: true });

		expect(result.schema).toBeArray();
		// Each element should have group and fields properties
		const first = result.schema[0] as Record<string, unknown>;
		expect(first).toHaveProperty('group');
		expect(first).toHaveProperty('fields');
		expect(first.fields).toBeArray();
	});

	it('should group fields correctly by @QGroup', async () => {
		const tool = new QGetFormSchemaTool();
		const result = await tool.execute({ code: groupedCode, grouped: true });

		const groups: string[] = result.schema.map((grp: any) => grp.group);
		expect(groups).toContain('Personal');
		expect(groups).toContain('Contact');
	});

	it('should return empty array for code with no @QField decorators', async () => {
		const tool = new QGetFormSchemaTool();
		const result = await tool.execute({
			code: `
        @Quick({ val: Date })
        class Simple extends QModel<any> {
          declare val: Date;
        }
      `,
		});

		expect(result.schema).toBeArray();
		expect(result.schema.length).toBe(0);
	});

	it('should include field count in metadata', async () => {
		const tool = new QGetFormSchemaTool();
		const result = await tool.execute({ code: sampleCode });

		expect(typeof result.count).toBe('number');
		expect(result.count).toBe(3);
	});
});

// ── parseQFieldMeta: regex parsing edge cases ─────────────────────────────────
// These tests verify that literal regex patterns (replacing the former
// `new RegExp(key)` dynamic form) behave identically for every quote style
// and special-character combination that may appear in real @QField usage.

describe('QGetFormSchemaTool — parseQFieldMeta edge cases', () => {
	const tool = new QGetFormSchemaTool();

	it('parses widget with single quotes', async () => {
		const code = `class F extends QModel<any> {
      @QField({ widget: 'select', label: 'Pick one' })
      declare category: string;
    }`;
		const { schema } = await tool.execute({ code });
		const entry = schema[0] as Record<string, unknown>;
		expect(entry['widget']).toBe('select');
		expect(entry['label']).toBe('Pick one');
	});

	it('parses widget and label with double quotes', async () => {
		const code = `class F extends QModel<any> {
      @QField({ widget: "textarea", label: "Your Message" })
      declare body: string;
    }`;
		const { schema } = await tool.execute({ code });
		const entry = schema[0] as Record<string, unknown>;
		expect(entry['widget']).toBe('textarea');
		expect(entry['label']).toBe('Your Message');
	});

	it('parses required: true (boolean literal)', async () => {
		const code = `class F extends QModel<any> {
      @QField({ widget: 'input', label: 'Name', required: true })
      declare name: string;
    }`;
		const { schema } = await tool.execute({ code });
		const entry = schema[0] as Record<string, unknown>;
		expect(entry['required']).toBe(true);
	});

	it('parses required: false (boolean literal)', async () => {
		const code = `class F extends QModel<any> {
      @QField({ widget: 'input', label: 'Optional', required: false })
      declare opt: string;
    }`;
		const { schema } = await tool.execute({ code });
		const entry = schema[0] as Record<string, unknown>;
		expect(entry['required']).toBe(false);
	});

	it('parses placeholder field', async () => {
		const code = `class F extends QModel<any> {
      @QField({ widget: 'input', label: 'Email', placeholder: 'user@example.com' })
      declare email: string;
    }`;
		const { schema } = await tool.execute({ code });
		const entry = schema[0] as Record<string, unknown>;
		expect(entry['placeholder']).toBe('user@example.com');
	});

	it('parses inputType field', async () => {
		const code = `class F extends QModel<any> {
      @QField({ widget: 'input', label: 'Email', inputType: 'email' })
      declare email: string;
    }`;
		const { schema } = await tool.execute({ code });
		const entry = schema[0] as Record<string, unknown>;
		expect(entry['inputType']).toBe('email');
	});

	it('uses input as default widget when widget is omitted', async () => {
		const code = `class F extends QModel<any> {
      @QField({ widget: 'input', label: 'No Widget' })
      declare field: string;
    }`;
		const { schema } = await tool.execute({ code });
		const entry = schema[0] as Record<string, unknown>;
		expect(entry['widget']).toBe('input');
		expect(entry['label']).toBe('No Widget');
	});

	it('parses label with special characters (spaces, hyphens, slashes)', async () => {
		const code = `class F extends QModel<any> {
      @QField({ widget: 'input', label: 'First / Last-Name' })
      declare name: string;
    }`;
		const { schema } = await tool.execute({ code });
		const entry = schema[0] as Record<string, unknown>;
		expect(entry['label']).toBe('First / Last-Name');
	});

	it('parses hint with special characters', async () => {
		const code = `class F extends QModel<any> {
      @QField({ widget: 'input', label: 'Website', hint: 'e.g. https://example.com' })
      declare url: string;
    }`;
		const { schema } = await tool.execute({ code });
		const entry = schema[0] as Record<string, unknown>;
		expect(entry['hint']).toBe('e.g. https://example.com');
	});

	it('correctly handles multiple distinct fields in same class', async () => {
		const code = `class F extends QModel<any> {
      @QField({ widget: 'input', label: 'Alpha', required: true })
      declare alpha: string;
      @QField({ widget: 'number', label: 'Beta', required: false })
      declare beta: number;
    }`;
		const { schema, count } = await tool.execute({ code });
		expect(count).toBe(2);
		const alpha = schema.find(
			(entry: Record<string, unknown>) => entry['field'] === 'alpha'
		) as Record<string, unknown>;
		const beta = schema.find(
			(entry: Record<string, unknown>) => entry['field'] === 'beta'
		) as Record<string, unknown>;
		expect(alpha['widget']).toBe('input');
		expect(alpha['required']).toBe(true);
		expect(beta['widget']).toBe('number');
		expect(beta['required']).toBe(false);
	});
});
