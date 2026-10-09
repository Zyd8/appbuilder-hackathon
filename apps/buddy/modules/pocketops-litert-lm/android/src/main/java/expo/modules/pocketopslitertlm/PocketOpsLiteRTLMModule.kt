package expo.modules.pocketopslitertlm

import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Content
import com.google.ai.edge.litertlm.Contents
import com.google.ai.edge.litertlm.Conversation
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Minimal on-device LiteRT-LM bridge for the Buddy chatbot.
 *
 * One engine and one conversation are held at a time; call `unload` before switching models.
 * Text, image, and audio parts are passed straight through to `Conversation.sendMessage`.
 */
class PocketOpsLiteRTLMModule : Module() {
  private var engine: Engine? = null
  private var conversation: Conversation? = null

  override fun definition() = ModuleDefinition {
    Name("PocketOpsLiteRTLM")

    AsyncFunction("isLoaded") {
      engine != null && conversation != null
    }

    AsyncFunction("loadModel") { modelPath: String, promise: Promise ->
      try {
        unloadInternal()
        if (modelPath.isBlank()) throw IllegalArgumentException("Model path is empty")
        val config = EngineConfig(modelPath = modelPath, backend = Backend.CPU())
        val next = Engine(config)
        next.initialize()
        engine = next
        conversation = next.createConversation()
        promise.resolve(mapOf("runtime" to "LiteRT-LM", "backend" to "cpu"))
      } catch (cause: Throwable) {
        unloadInternal()
        promise.reject("LITERT_LOAD_FAILED", cause.message ?: "Could not load the on-device model", cause)
      }
    }

    AsyncFunction("generate") { prompt: String, imagePaths: List<String>, audioPaths: List<String>, promise: Promise ->
      try {
        val active = conversation ?: throw IllegalStateException("The on-device model is not loaded")
        val parts = mutableListOf<Content>()
        imagePaths.forEach { parts.add(Content.ImageFile(it)) }
        audioPaths.forEach { parts.add(Content.AudioFile(it)) }
        parts.add(Content.Text(prompt))
        val response = active.sendMessage(Contents.of(*parts.toTypedArray()))
        promise.resolve(response.toString())
      } catch (cause: Throwable) {
        promise.reject("LITERT_GENERATE_FAILED", cause.message ?: "On-device generation failed", cause)
      }
    }

    AsyncFunction("unload") {
      unloadInternal()
      true
    }

    OnDestroy {
      unloadInternal()
    }
  }

  private fun unloadInternal() {
    try {
      conversation?.close()
    } catch (_: Throwable) {
    }
    try {
      engine?.close()
    } catch (_: Throwable) {
    }
    conversation = null
    engine = null
  }
}
