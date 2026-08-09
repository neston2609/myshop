"use client";

import { ImageUploadField } from "@/components/image-upload-field";

type LogoUploadFieldProps = {
  defaultValue?: string | null;
};

export function LogoUploadField({ defaultValue }: LogoUploadFieldProps) {
  return (
    <div className="md:col-span-2">
      <ImageUploadField
        name="logoUrl"
        label="Shop logo"
        helpText="PNG, JPG, or WebP. The saved logo appears in the storefront header."
        defaultValue={defaultValue}
        previewClassName="h-16 w-32"
        imageClassName="object-contain"
      />
    </div>
  );
}
