import Image from "next/image";

export function BrandLogo() {
  return (
    <Image
      src="/logo/logo.png"
      alt="Ipin"
      width={36}
      height={36}
      className="h-8 w-8 shrink-0 rounded-lg object-cover sm:h-9 sm:w-9"
      priority
    />
  );
}
