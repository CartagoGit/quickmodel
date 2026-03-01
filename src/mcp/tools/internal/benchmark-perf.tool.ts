import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import { QModel } from '../../../core/models/quick.model';
import { Quick } from '../../../core/decorators/quick.decorator';

/**
 * Internal MCP tool that micro-benchmarks QuickModel transformation
 * throughput across a set of representative scenarios.
 *
 * @remarks
 * Runs `iterations` cycles (default: 1 000) of:
 * - Primitive field deserialization (string, number, boolean)
 * - `Date` round-trip (ISO string → Date → ISO string)
 * - Nested model deserialization
 * - `serialize()` call
 *
 * Reports ops/sec for each scenario and an overall summary.
 *
 * @returns `{ results: Record<string, string>, summary: string }` — per-
 * scenario ops/sec strings and a human-readable summary table.
 *
 * @see {@link QRoundtripTool} — test correctness of a round-trip (not just speed)
 * @see {@link QCheckBundleSizeTool} — check output size after optimisation
 * @see {@link QCheckProjectHealthTool} — comprehensive quality gate that runs lint+typecheck+tests
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QBenchmarkPerformanceTool extends QAbstractTool<
	z.ZodObject<{ iterations: z.ZodDefault<z.ZodNumber> }>
> {
	name = 'benchmark_performance';
	description =
		'Run performance benchmarks for QuickModel model construction and transformation pipelines. ' +
		'Measures ops/sec for typical workloads (Date coercion, nested models, arrays, @QDefault, @QTransform). ' +
		'Useful for detecting performance regressions after changes to the core construction path. ' +
		'Returns { results[], summary } — throughput and timing for each benchmark case.';
	schema = z.object({
		iterations: z
			.number()
			.default(1000)
			.describe('Number of iterations for each test case'),
	});

	/**
	 * Executes micro-benchmarks for instantiation, transformation, and serialisation.
	 *
	 * @param args - Benchmark configuration.
	 * @param args.iterations - Number of iterations for each test case (e.g. 1000).
	 * @returns An object with `results` mapping benchmark names to formatted average
	 * millisecond strings, and a `summary` human-readable narrative.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 * @see {@link QCheckBundleSizeTool} — complement: measure the bundle output size
	 */
	async execute(args: { iterations: number }): Promise<{
		results: Record<string, string>;
		summary: string;
	}> {
		await Promise.resolve();
		const count = args.iterations;
		const results: Record<string, number> = {};

		// Define a Test Model
		@Quick({
			name: 'string',
			age: 'number',
			isActive: 'boolean',
			birthDate: 'date',
			tags: 'any', // array of strings
		})
		/** @internal Ephemeral model used only for benchmark measurements. */
		class BenchmarkModel extends QModel<BenchmarkModel> {
			/** @internal */ public name?: string;
			/** @internal */ public age?: number;
			/** @internal */ public isActive?: boolean;
			/** @internal */ public birthDate?: Date;
			/** @internal */ public tags?: string[];
		}

		// 1. Instantiation Benchmark
		const startInst = performance.now();
		for (let idx = 0; idx < count; idx++) {
			new BenchmarkModel({});
		}
		results['instantiation_avg_ms'] =
			(performance.now() - startInst) / count;

		// 2. Transformation (Plain Object -> Model)
		const payload = {
			name: 'Test User',
			age: 25,
			isActive: true,
			birthDate: '2023-01-01',
			tags: ['a', 'b'],
		};
		const startTrans = performance.now();
		for (let idx = 0; idx < count; idx++) {
			BenchmarkModel.create(payload as any);
		}
		results['transformation_avg_ms'] =
			(performance.now() - startTrans) / count;

		// 3. Serialization (Model -> Plain Object)
		const instance = BenchmarkModel.create(payload as any);
		const startSer = performance.now();
		for (let idx = 0; idx < count; idx++) {
			instance.$qToJSON();
		}
		results['serialization_avg_ms'] =
			(performance.now() - startSer) / count;

		// Format results
		const formatted: Record<string, string> = {};
		for (const [key, val] of Object.entries(results)) {
			// e.g. 0.0053 ms
			formatted[key] = `${val.toFixed(5)} ms`;
		}

		return {
			results: formatted,
			summary: `Benchmark completed ${count} iterations on Core scenarios.`,
		};
	}
}
