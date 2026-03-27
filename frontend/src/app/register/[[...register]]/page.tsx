import RegisterPage from "./register-client";

export function generateStaticParams() {
  return [{ register: [] }];
}

export default function Page() {
  return <RegisterPage />;
}
