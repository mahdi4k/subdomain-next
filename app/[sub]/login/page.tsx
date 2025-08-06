// app/[sub]/login/page.tsx
import { FC } from "react";
import LoginPage from "./_component/LoginPage";

interface LoginPageProps {
  params: {
    sub: string; // e.g., 'car', 'bike'
  };
}

const Page: FC<LoginPageProps> = async ({ params }) => {
  const { sub } = params;
  return (
    <div>
      <LoginPage type={sub} />
    </div>
  );
};

export default Page;