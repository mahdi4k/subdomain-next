import { FC } from "react";

interface LoginPageProps {
  params: {
    sub: string; // e.g. 'car', 'bike'
  };
}

const Page: FC<LoginPageProps> = async ({ params }) => {
  const { sub } = params;
  return <div>{sub}</div>;
};

export default Page;
