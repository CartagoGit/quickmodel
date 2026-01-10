
import { Serializer } from './src/core/services/serializer.service';
import { BigIntTransformer } from './src/transformers/bigint.transformer';
import "reflect-metadata"; // Ensure reflect-metadata is loaded if needed, though Serializer imports it via decorator imports usually

const serializer = new Serializer();
// Manually check if transformers are registered (since they are private, we try to serialize)

const data = {
    value: 123n
};

try {
    const json = serializer.serializeToJson(data);
    console.log("Success:", json);
} catch (e) {
    console.error("Error:", e);
}
