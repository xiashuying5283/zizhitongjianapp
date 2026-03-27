declare module 'opencc-js' {
  export interface ConverterOptions {
    from: string;
    to: string;
  }

  export function Converter(options: ConverterOptions): (text: string) => string;

  export function HTMLConverter(options: ConverterOptions): {
    convert: (html: string) => string;
  };
}
