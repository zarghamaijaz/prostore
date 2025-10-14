export {};

declare global {
  // Example: add your custom types here
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_API_URL?: string;
    }
  }

  interface Window {
    myCustomProp?: string;
  }
}
