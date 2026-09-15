export function getServiceName(): string {
  return process.env.SERVICE_NAME?.trim() || "BGM";
}
