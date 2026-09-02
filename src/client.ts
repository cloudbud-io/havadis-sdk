import {
  FetchTransport,
  type FetchTransportOptions,
  type Transport,
} from './core/transport.js';
import {
  BrandScope,
  BrandsResource,
  CreditsResource,
  MeResource,
} from './resources/resources.js';

export interface HavadisOptions
  extends Omit<FetchTransportOptions, 'apiKey'> {
  /** `havadis_<prefix>_<secret>` — server-side only, never in a browser. */
  apiKey: string;
  /** Bring your own transport (tests, instrumentation). */
  transport?: Transport;
}

/**
 * Composition root — wires resources onto a transport and nothing more.
 * All behavior lives in core/ and resources/; adding a resource is one
 * property here.
 */
export class Havadis {
  readonly me: MeResource;
  readonly brands: BrandsResource;
  readonly credits: CreditsResource;
  private readonly transport: Transport;
  private readonly scopes = new Map<string, BrandScope>();

  constructor(options: HavadisOptions) {
    // Second layer of the browser guard (the package.json `browser`
    // condition is the first): whatever bundler path led here, a key must
    // not boot in an environment that ships it to visitors.
    const maybeWindow = (globalThis as { window?: unknown }).window;
    if (maybeWindow !== undefined) {
      throw new Error(
        '@havadis/sdk is server-side only: constructing it in a browser ' +
          'would expose your API key to every visitor. Call the API from ' +
          'your backend and pass data to the client.',
      );
    }
    if (!options.apiKey?.startsWith('havadis_')) {
      throw new Error(
        "Invalid API key — expected the 'havadis_<prefix>_<secret>' shape " +
          'from Settings → Developer.',
      );
    }
    this.transport =
      options.transport ?? new FetchTransport(options);
    this.me = new MeResource(this.transport);
    this.brands = new BrandsResource(this.transport);
    this.credits = new CreditsResource(this.transport);
  }

  /** Brand-scoped accessors: `client.brand(id).jobs.createAndWait(...)`. */
  brand(brandId: string): BrandScope {
    let scope = this.scopes.get(brandId);
    if (!scope) {
      scope = new BrandScope(this.transport, brandId);
      this.scopes.set(brandId, scope);
    }
    return scope;
  }
}
