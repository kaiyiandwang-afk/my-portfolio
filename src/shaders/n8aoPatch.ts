import { N8AOPostPass } from 'n8ao'

/**
 * Workaround for n8ao 2.0.1 on three r187.
 *
 * N8AO's half-res depth target subclasses WebGLRenderTarget and overrides `.texture` to return the whole `.textures`
 * array. three's setupRenderTarget now reads `renderTarget.texture.mipmaps`, so it throws on the first frame. N8AO only
 * ever reads `.textures` on this target, so restoring the standard accessor on the instance is safe.
 *
 * Delete this file (and its import in Effects.tsx) once n8ao fixes it. To check: remove the import and look for a
 * "reading 'length'" crash in setupRenderTarget.
 */
const prototype = N8AOPostPass.prototype as unknown as {
  configureHalfResTargets: (this: { depthDownsampleTarget?: { textures: unknown[] } }, ...args: unknown[]) => void
}

const configure = prototype.configureHalfResTargets

prototype.configureHalfResTargets = function (...args) {
  configure.apply(this, args)
  const target = this.depthDownsampleTarget
  if (target) {
    Object.defineProperty(target, 'texture', {
      configurable: true,
      get: () => target.textures[0],
      set: (value: unknown) => {
        target.textures[0] = value
      },
    })
  }
}
