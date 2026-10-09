package expo.modules.pocketopslitertlm

import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PocketOpsLiteRTLMModule : Module() {
  private var engine: Engine? = null
  private var conversation: Any? = null

  override fun definition() = ModuleDefinition {
    Name("PocketOpsLiteRTLM")

    AsyncFunction("initialize") { modelPath: String, promise: Promise ->
      try {
        engine?.close()
        val config = EngineConfig(modelPath = modelPath, backend = Backend.CPU())
        val nextEngine = Engine(config)
        nextEngine.initialize()
        engine = nextEngine
        conversation = nextEngine.createConversation()
        promise.resolve(mapOf("runtime" to "LiteRT-LM", "modelPath" to modelPath))
      } catch (cause: Throwable) {
        promise.reject("LITERT_INIT_FAILED", cause.message ?: "LiteRT-LM initialization failed", cause)
      }
    }

    AsyncFunction("generate") { prompt: String, promise: Promise ->
      try {
        val activeEngine = engine ?: throw IllegalStateException("LiteRT-LM is not initialized")
        val activeConversation = conversation ?: activeEngine.createConversation().also { conversation = it }
        val response = activeConversation.javaClass.getMethod("sendMessage", String::class.java).invoke(activeConversation, prompt)
        promise.resolve(response.toString())
      } catch (cause: Throwable) {
        promise.reject("LITERT_GENERATE_FAILED", cause.message ?: "LiteRT-LM generation failed", cause)
      }
    }

    AsyncFunction("release") {
      engine?.close()
      engine = null
      conversation = null
      null
    }
  }
}
