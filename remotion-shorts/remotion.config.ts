import { Config } from "@remotion/cli/config";
// GPU WebGL backend for headless Chrome on this Linux box (see orchestration setup.md "GL backend check")
Config.setChromiumOpenGlRenderer((process.env.REMOTION_GL as any) || "angle-egl");
