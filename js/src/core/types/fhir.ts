export type Code = {
  system: string;
  code: string;
  display: string;
};

export type BundleEntry = {
  fullUrl?: string;
  resource: any;
  request: {
    method: string;
    url: string;
  };
};
