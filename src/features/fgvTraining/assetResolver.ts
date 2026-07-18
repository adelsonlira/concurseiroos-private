const ABSOLUTE_LOCAL_PATH = /^(?:[A-Za-z]:[\\/]|\\\\|\/home\/|\/Users\/|\/var\/|\/tmp\/|file:)/i;

export function validateFgvTrainingAssetPath(assetPath: string): boolean {
  return Boolean(assetPath)
    && !ABSOLUTE_LOCAL_PATH.test(assetPath)
    && !assetPath.includes("..")
    && !assetPath.startsWith("/")
    && assetPath.startsWith("fgv-training/assets/");
}

export function resolveFgvTrainingAsset(assetPath: string): string | null {
  if (!validateFgvTrainingAssetPath(assetPath)) return null;
  if (typeof document === "undefined") return `/${assetPath}`;
  return new URL(assetPath, document.baseURI).toString();
}
