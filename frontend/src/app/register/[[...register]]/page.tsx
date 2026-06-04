import RegisterPage from "./register-client";
import { Suspense } from "react";

export function generateStaticParams() {
  return [{ register: [] }];
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RegisterPage />
    </Suspense>
  );
}
