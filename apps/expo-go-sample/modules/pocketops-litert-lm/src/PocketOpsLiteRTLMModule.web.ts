import { registerWebModule, NativeModule } from 'expo';

// PocketOpsLiteRTLMModule is not available on the web platform.
class PocketOpsLiteRTLMModule extends NativeModule<{}> {}

export default registerWebModule(PocketOpsLiteRTLMModule, 'PocketOpsLiteRTLMModule');
