import LoginPage from "./login-client";
import { Suspense } from "react";

export function generateStaticParams() {
  return [{ login: [] }];
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
