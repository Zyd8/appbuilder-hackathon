import { Directory, File, Paths } from 'expo-file-system';
import type { ModelArtifact } from './model-catalog';

export function validateArtifactFilename(filename: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.gguf$/.test(filename) || filename.includes('..')) {
    throw new Error('Invalid model artifact filename');
  }
}

export function modelsDirectory(): Directory {
  return new Directory(Paths.document, 'buddy-models');
}

export function artifactFile(artifact: ModelArtifact): File {
  validateArtifactFilename(artifact.filename);
  return new File(modelsDirectory(), artifact.filename);
}

export function nativeModelPath(file: File): string {
  const root = modelsDirectory().uri.replace(/\/+$/, '');
  if (!file.uri.startsWith(root + '/')) throw new Error('Model path is outside app storage');
  return file.uri.replace(/^file:\/\//, '');
}
