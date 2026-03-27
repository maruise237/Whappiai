import LoginPage from "./login-client";

export function generateStaticParams() {
  return [{ login: [] }];
}

export default function Page() {
  return <LoginPage />;
}
