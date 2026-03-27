declare module 'opencc-js' {
  export interface ConverterOptions {
    from?: string;
    to?: string;
  }

  export function Converter(options: ConverterOptions): (text: string) => string;

  export const SimplifiedToTraditional: (text: string) => string;
  export const TraditionalToSimplified: (text: string) => string;
}
