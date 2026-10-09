import ExpoModulesCore

/// iOS LiteRT-LM bridge.
///
/// Not implemented yet: the LiteRT-LM Swift Package is not linked into this build. The module
/// exists so the shared TypeScript contract compiles and so the app can report an honest
/// "not available on this platform" state instead of silently failing or falling back to cloud.
public class PocketOpsLiteRTLMModule: Module {
  private static let unavailable = "On-device LiteRT-LM is not available on iOS in this build yet."

  public func definition() -> ModuleDefinition {
    Name("PocketOpsLiteRTLM")

    AsyncFunction("isLoaded") { false }

    AsyncFunction("loadModel") { (_: String) in
      throw NSError(domain: "PocketOpsLiteRTLM", code: 1, userInfo: [NSLocalizedDescriptionKey: Self.unavailable])
    }

    AsyncFunction("generate") { (_: String, _: [String], _: [String]) in
      throw NSError(domain: "PocketOpsLiteRTLM", code: 2, userInfo: [NSLocalizedDescriptionKey: Self.unavailable])
    }

    AsyncFunction("unload") { true }
  }
}
