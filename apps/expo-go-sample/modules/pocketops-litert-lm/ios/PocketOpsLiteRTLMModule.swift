import ExpoModulesCore

public class PocketOpsLiteRTLMModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PocketOpsLiteRTLM")

    AsyncFunction("initialize") { (_: String) in
      throw NSError(domain: "PocketOpsLiteRTLM", code: 1, userInfo: [NSLocalizedDescriptionKey: "LiteRT-LM Swift Package is not linked in this development build yet."])
    }

    AsyncFunction("generate") { (_: String) in
      throw NSError(domain: "PocketOpsLiteRTLM", code: 2, userInfo: [NSLocalizedDescriptionKey: "LiteRT-LM is unavailable on iOS until its Swift Package integration is enabled."])
    }

    AsyncFunction("release") { }
  }
}
