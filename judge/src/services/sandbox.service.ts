import { Sandbox } from "@vercel/sandbox";

const IMAGE = "apexcode-runtime:v2";

export async function createSandbox() {
  return Sandbox.create({
    image: IMAGE,
    timeout: 60_000,
    resources: {
      vcpus: 1,
    },
    networkPolicy: "deny-all",
    persistent: false,
  });
}