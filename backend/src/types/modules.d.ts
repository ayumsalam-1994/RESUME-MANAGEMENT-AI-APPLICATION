declare module "pdf-parse" {
  interface LoadParameters {
    data?: Buffer;
    url?: string | URL;
    password?: string;
    verbosity?: number;
  }
  interface TextResult {
    text: string;
  }
  class PDFParse {
    constructor(params: LoadParameters);
    getText(params?: Record<string, unknown>): Promise<TextResult>;
    destroy(): Promise<void>;
  }
  export { PDFParse };
}

declare module "mammoth" {
  interface ConversionResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }
  function extractRawText(options: { buffer: Buffer }): Promise<ConversionResult>;
  export { extractRawText };
}
